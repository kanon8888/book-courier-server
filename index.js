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
