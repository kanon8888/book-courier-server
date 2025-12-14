const express = require('express')
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 3000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET);


const crypto = require("crypto");
const admin = require("firebase-admin");

const serviceAccount = require("./book-courier-firebase-adminsdk-fbsvc.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


function generateTrackingId() {
    const prefix = "PRCL";
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = crypto.randomBytes(3).toString("hex").toUpperCase();

    return `${prefix}-${date}-${random}`;
}


// middlware
app.use(express.json());
app.use(cors());

const verifyFBToken = async (req, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    try {
        const idToken = token.split(' ')[1];
        const decoded = await admin.auth().verifyIdToken(idToken);
        console.log('decoded in the token', decoded);
        req.decoded_email = decoded.email;
        next();
    }
    catch (err) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fbisr7m.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const db = client.db('book_courier');
        const usersCollection = db.collection('users');
        const booksCollection = db.collection('books');
        const allBookCollection = db.collection('allBook');

        const paymentCollection = db.collection('payment')

        // book api
        app.get('/books', async (req, res) => {
            const query = {}
            const { email } = req.query;
            // books?email=''&
            if (email) {
                query.senderEmail = email;
            }

            const options = { sort: { createdAt: -1 } }

            const cursor = booksCollection.find(query, options);
            const result = await cursor.toArray();
            res.send(result);
        })
        app.get('/books/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await booksCollection.findOne(query);
            res.send(result);
        })

        app.post('/books', async (req, res) => {
            const book = req.body;
            book.createdAt = new Date();
            const result = await booksCollection.insertOne(book);
            res.send(result)
        })


        app.delete('/books/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await booksCollection.deleteOne(query);
            res.send(result);
        })

        // // payment related apis
        // const YOURE_DOMAIN = 'http://localhost:4242';

        // app.post('/payment-checkout-session', async (req, res) => {
        //     const paymentInfo = req.body;
        //     const amount = parseInt(paymentInfo.cost) * 100;
        //     const session = await stripe.checkout.sessions.create({

        //         line_items: [
        //             {
        //                 price_data: {
        //                     currency: 'usd',
        //                     unit_amount: amount,
        //                     product_data: {
        //                         name: `Please pay for: ${paymentInfo.bookName}`
        //                     }
        //                 },
        //                 quantity: 1,
        //             },
        //         ],
        //         mode: 'payment',
        //         metadata: {
        //             bookId: paymentInfo.bookId
        //         },
        //         customer_email: paymentInfo.senderEmail,
        //         success_url: `${YOURE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        //         cancel_url: `${YOURE_DOMAIN}/dashboard/payment-cancelled`,

        //     })
        //     res.send({ url: session.url })
        // })

        // payment related apis

        const YOURE_DOMAIN = 'http://localhost:5173';

        app.post('/payment-checkout-session', async (req, res) => {
            try {
                const paymentInfo = req.body;
                const amount = parseInt(paymentInfo.cost) * 100;

                const session = await stripe.checkout.sessions.create({
                    line_items: [
                        {
                            price_data: {
                                currency: 'usd',
                                unit_amount: amount,
                                product_data: {
                                    name: `Please pay for: ${paymentInfo.bookName}`,
                                },
                            },
                            quantity: 1,
                        },
                    ],
                    mode: 'payment',
                    metadata: {
                        bookId: paymentInfo.bookId,
                    },
                    customer_email: paymentInfo.senderEmail,
                    success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
                });

                res.send({ url: session.url });

            } catch (error) {
                console.log("Stripe Error:", error);
                res.status(500).send({ error: error.message });
            }
        });



        const YOUR_DOMAIN = 'http://localhost:5173';
        app.post('/create-checkout-session', async (req, res) => {
            const paymentInfo = req.body;
            const amount = Number(paymentInfo.cost) * 100;


            const session = await stripe.checkout.sessions.create({
                line_items: [
                    {
                        price_data: {
                            currency: 'USD',
                            unit_amount: amount,
                            product_data: {
                                name: paymentInfo.bookName
                            }
                        },
                        quantity: 1,
                    },
                ],
                customer_email: paymentInfo.senderEmail,
                mode: 'payment',
                metadata: {
                    bookId: paymentInfo.bookId,
                    bookName: paymentInfo.bookName
                },
                success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success`,
                cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
            })

            console.log(session)
            res.send({ url: session.url })

        })

        app.patch('/payment-success', async (req, res) => {
            const sessionId = req.query.session_id;
            const session = await stripe.checkout.sessions.retrieve(sessionId);

            // console.log('session retrieve', session)
            const transactionIb = session.payment_intent;
            const query = { transactionIb: transactionIb }

            const paymentExist = await paymentCollection.findOne(query);
            console.log(paymentExist);

            if (paymentExist) {
                return res.send({ message: 'already exists', transactionIb, trackingId: paymentExist.trackingId })
            }



            const trackingId = generateTrackingId()

            if (session.payment_status === 'paid') {
                const id = session.metadata.bookId;
                const query = { _id: new ObjectId(id) }
                const update = {
                    $set: {
                        paymentStatus: 'paid',
                        trackingId: trackingId
                    }
                }

                const result = await booksCollection.updateOne(query, update);
                const payment = {
                    amount: session.amount_total / 100,
                    currency: session.currency,
                    customElements: session.customer_email,
                    bookId: session.metadata.bookId,
                    bookName: session.metadata.bookName,
                    transactionIb: session.payment_intent,
                    paymentStatus: session.payment_status,
                    paidAt: new Date(),
                    trackingId: trackingId

                }
                if (session.payment_status === 'paid') {
                    const resultPayment = await paymentCollection.insertOne(payment)

                    res.send({
                        success: true,
                        modifyBook: result,
                        trackingId: trackingId,
                        transactionIb: session.payment_intent,
                        paymentInfo: resultPayment
                    })
                }

            }

            res.send({ success: false })
        })

        // payment related apis
        app.get('/payments', verifyFBToken, async (req, res) => {
            const email = req.query.email;
            console.log(email)
            const query = {}
            // console.log('headers', req.headers)
            if (email) {
                query.customElements = email;
                // check email address
                if (email !== req.decoded_email) {
                    return res.status(403).send({ message: 'forbidden access' })
                }
            }
            const cursor = paymentCollection.find(query).sort({ paidAt: -1 });
            const result = await cursor.toArray();
            res.send(result);
        })


        app.post("/allBook", async (req, res) => {
            try {
                const book = req.body;
                book.createdAt = new Date();
                const result = await allBookCollection.insertOne(book);
                res.send(result);
            } catch (err) {
                console.log(err);
                res.status(500).send({ message: "Failed to save book", error: err });
            }
        });


        app.get("/allBook", async (req, res) => {
            try {
                const books = await allBookCollection.find().toArray();
                res.send(books);
            } catch (err) {
                console.log(err);
                res.status(500).send({ message: "Failed to fetch books", error: err });
            }
        });


        app.get("/allBook/:id", async (req, res) => {
            console.log(req.params)
            try {
                const id = req.params.id;
                const book = await allBookCollection.findOne({ _id: new ObjectId(id) });
                res.send(book);
            } catch (err) {
                console.log(err);
                res.status(500).send({ message: "Failed to fetch book", error: err });
            }
        });


        app.delete("/allBook/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const result = await allBookCollection.deleteOne({ _id: new ObjectId(id) });
                res.send(result);
            } catch (err) {
                console.log(err);
                res.status(500).send({ message: "Failed to delete book", error: err });
            }
        });





        app.post('/users', async (req, res) => {
            const user = req.body;


            const query = { email: user.email };
            const existingUser = await usersCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: 'user already exists' });
            }

            // default role user
            const newUser = {
                name: user.name,
                email: user.email,
                photo: user.photo || '',
                role: 'user',
                createdAt: new Date()
            };

            const result = await usersCollection.insertOne(newUser);
            res.send(result);
        });

        app.get("/users/:email", async (req, res) => {
            const user = await usersCollection.findOne({ email: req.params.email });
            res.send(user);
        });


        app.put("/users/:email", async (req, res) => {
            const { name, photo } = req.body;

            const result = await usersCollection.updateOne(
                { email: req.params.email },
                { $set: { name, photo } }
            );

            res.send(result);
        });




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Book world!')
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



