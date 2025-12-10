const express = require('express')
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 3000
const { MongoClient, ServerApiVersion } = require('mongodb');

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

        app.post('/books', async (req, res) => {
            const book = req.body;
            book.createdAt = new Date();
            const result = await booksCollection.insertOne(book);
            res.send(result)
        })


        // POST /allBook → Add new book
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

        // GET /allBook → Get all books
        app.get("/allBook", async (req, res) => {
            try {
                const books = await allBookCollection.find().toArray();
                res.send(books);
            } catch (err) {
                console.log(err);
                res.status(500).send({ message: "Failed to fetch books", error: err });
            }
        });

        // GET /allBook/:id → Get single book
        app.get("/allBook/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const book = await allBookCollection.findOne({ _id: new ObjectId(id) });
                res.send(book);
            } catch (err) {
                console.log(err);
                res.status(500).send({ message: "Failed to fetch book", error: err });
            }
        });

        // DELETE /allBook/:id → Delete book
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

        // server start
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



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
