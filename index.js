const express = require("express");
const cors = require("cors");
var cookieParser = require('cookie-parser')
require('dotenv').config()
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const jwt = require('jsonwebtoken');
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}));
app.use(cookieParser())



const uri =
  `mongodb+srv://${process.env.Db_user}:${process.env.db_password}@cluster0.2m0rny5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const verifyJWT = async (req, res, next) => {
  const token = req?.cookies?.token
  if(!token){
   return res.status(401).send({message: 'Unauthorized access'})
  }
  jwt.verify(token, process.env.Access_Token, (err, decode) => {
    if(err) {
     return res.status(401).send({message: 'Unauthorized access'})
    }
    req.user = decode
    next()
  })
}
async function run() {
  try {
    const serviceCollection = await client.db("carDoctorbd").collection("servicesCar");
     const orderCollection = await client.db("carDoctorbd").collection("ordersCar")
   
    app.post('/jwt', async (req, res) => {
      const user = req.body 
     const token = jwt.sign(user, process.env.Access_Token, {expiresIn: '1h'})
      res
      .cookie('token', token,{
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
      .send({success: true})
    })
    app.post('/logout', async(req, res) => {
      const user = req.body
      console.log('logout user', user)
      res
      .clearCookie('token', {maxAge: 0})
      .send({success: true})
    })
     app.get("/services", async (req, res) => {
      const result = await serviceCollection.find().toArray();
      res.send(result);
    });
    app.get("/services/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const options = {
          projection: { title: 1, price: 1, service_id: 1 },
        };
        const result = await serviceCollection.findOne(query, options)
        res.send(result);
      });

      app.post('/orders', async (req, res) => {
        const cursor = req.body
        const result = await orderCollection.insertOne(cursor)
        res.send(result);
      });
      app.get('/orders',verifyJWT, async (req, res) => {
        const email = req.query.email
      if(req?.query?.email !== req?.user?.email){
       return res.status(403).send({message: 'forbidden access'})
      }
        if(email) {
            const result = await orderCollection.find({email: email}).toArray();
            res.send(result);
        } else {
            const result = await orderCollection.find().toArray();
            res.send(result);
        }
      })
      app.patch('/orders/:id', async (req, res) => {
        const id = req.params.id
        const filter = {_id: new ObjectId(id)}
        const options = {upsert: true}
        const update = req.body
        const updateOrders = {
            $set: {
                status: update.status,
            }
        }
        const result = await orderCollection.updateOne(filter,updateOrders,options)
        res.send(result)
      })
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server running");
});

app.listen(port, () => {
  console.log(`listening on ${port}`);
});
