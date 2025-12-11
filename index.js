const express = require('express')
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 3000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')('sk_test_51Sd0AhCxMZ2RevbYJBkBAb8t3keqSvIYxyZczXJXzaCOGEx91CS7d5uNhzj1GFNTJ0HVaCAmkaS4qjLR4xSCR32n004m5oRQtw');


// middlware
app.use(express.json());
app.use(cors());



const uri = `mongodb+srv://book_Courier_user:9Q3CndttFVwg5ZTa@cluster0.fbisr7m.mongodb.net/?appName=Cluster0`;

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
        const booksCollection = db.collection('books');
        const allBookCollection = db.collection('allBook');
        const usersCollection = db.collection('users');

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

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

        // GET user data
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

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})


