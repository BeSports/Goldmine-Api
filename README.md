# Goldmine-Api

With Goldmine-Api we provide an easy way to query OrientDB in any nodejs project. This way you can transition easily
from another database language such as MongoDB without having to dig through all the documentation before getting started.

* [Usage](#usage)
* [Important](#important)
* [Functions](#functions)
  * [findOne(queryObject)](#findonequeryobject)
  * [find(queryObject)](#findqueryobject)
  * [findEdge(edgeObject)](#findedgeedgeobject)
  * [updateOne(queryObject, mergeObject)](#updateonequeryobject-mergeobject)
  * [update(queryObject, mergeObject)](#updatequeryobject-mergeobject)
  * [updateEdge(queryObject, mergeObject)](#updateedgequeryobject-mergeobject)
  * [delete(queryObject)](#deletequeryobject)
  * [deleteEdge(edgeObject)](#deleteedgeedgeobject)
  * [insertOne(insertObject)](#insertoneinsertobject)
  * [insertEdge(s)(edgesObject)](#insertedgesedgesobject)


# Usage
In our example we use this in an express based api.

```
const dbOptions = {
  username: 'goldmineapi', // database username
  password: 'goldmineapiSecretP4ssword', // database password
  servers: [
      {
        "host": "orientdev.kayzr.com",
        "port": 2424
      }
    ], // servers are defined in an array following the official documentation: http://orientdb.com/docs/last/OrientJS-Server.html#using-distributed-databases
  name: 'mydatabase', // name of your database on orient
  logging: true, //enables logging of long queries and errors
};

require('goldmine-api').connect(dbOptions, (db) => {
  global.db = db;

  const globalRouter = require('./api/router');
  app.use('/', globalRouter, function(req, res) {
    res.status(404).send({
      message: 'Path not found',
      status: 404,
    });
  });
  app.listen(3000);
});
```

After this import you can use all functions defined down below by calling them with `global.db` prepended.

# Important
**New classes** should **always** be created from **orientdb studio with all indexes defined**.
Also when using dates please define this fields in the orient studio before inserting into them.

# Functions
## findOne(queryObject)
```
const result = await global.db.findOne({
  collection: 'user',
  params: {
    username: 'mitchken'
  },
  fields: ['username'],
});
```
> { '@type': 'd',
>   _id: 'x5mxEBwhMfiLSQHaK',
>   username: 'mitchken',
>   '@rid': { [String: '#-2:0'] cluster: -2, position: 0 },
>   '@version': 0 }

## find(queryObject)
Sidenote: an additional parameter fast: true can be added to these queries to decrease their execution time drastically, mostly usefull on queries with really long extend paths which contain params.
```
const result = await global.db.find({
  collection: 'user',
  params: {
    admin: true
  },
  orderBy: [
    {
      field: 'username',
      direction: 'desc',
    },
  ],
  fields: ['username'],
});
```
> [{ '@type': 'd',
>     _id: 'x5mxEBwhMfiLSQHaK',
>     username: 'mitchken',
>     '@rid': { [String: '#-2:5'] cluster: -2, position: 5 },
>     '@version': 0 },
> ....
>   { '@type': 'd',
>     _id: 'W84Tzv9LFkCCjuBsA',
>     username: 'berkinovish',
>     '@rid': { [String: '#-2:6'] cluster: -2, position: 6 },
>     '@version': 0 } ]

## findEdge(edgeObject)
Sidenote: it often executes way faster if you request the objects the edge starts from/ ends at to fetch the edgeFields from those.
```
const res = await global.db.findEdge({
  edge: 'user_comment',
  from: {
    collection: 'user',
    params: {
      username: 'mitchken'
    }
  },
  limit: 2
});
```
>[ { '@class': 'user_comment',
    '@type': 'd',
    out: { [String: '#32:3359'] cluster: 32, position: 3359 },
    in: { [String: '#253:3'] cluster: 253, position: 3 },
    dateUpdated: '2017-09-27T07:52:37.238Z',
    '@rid': { [String: '#259:3'] cluster: 259, position: 3 },
    '@version': 9 },
  { '@class': 'user_comment',
    '@type': 'd',
    out: { [String: '#32:3359'] cluster: 32, position: 3359 },
    in: { [String: '#253:4'] cluster: 253, position: 4 },
    dateUpdated: '2017-09-27T07:52:37.238Z',
    '@rid': { [String: '#259:4'] cluster: 259, position: 4 },
    '@version': 9 } ]

## updateOne(queryObject, mergeObject)
```
const result = await global.db.updateOne(
  {
    collection: 'user',
    params: {
      username: 'testUser',
    },
  },
  {
    $set: {
      username: 'testUser123',
    },
    $return: 'count'
  },
);
```
> 1

## update(queryObject, mergeObject)
```
const result = await global.db.update(
  {
    collection: 'user',
    params: {
      moderator: {
        operator: 'is defined'
      }
    },
  },
  {
    moderator: true
  }
);
```
> 21

## updateEdge(queryObject, mergeObject)
```
const result = await global.db.updateEdge(
  {
    edge: 'user_teamSize',
    from: {
      collection: 'user',
      params: {
        username: 'mitchken'
      }
    },
    to: {
      collection: 'teamSize',
      params: 'qlsdiurbhgfakejzrnbggpmau'
    }
  },
  {
    $increment: {
      rating: 69
    }
  }
);
```
 > 1

## delete(queryObject)
```
const result = await global.db.delete(
  {
    collection: 'order',
    params: {
      product: {
        operator: 'is not defined'
      }
    }
  }
);
```
 > 12

## deleteEdge(edgeObject)
```
const res = await global.db.deleteEdge({
  edge: 'user_comment_upvoted',
  from: {
    collection: 'user',
    params: {
      username: 'mitchken'
    }
  },
});
    console.log(res);
```
 > ['3'] (entries changed)

## insertOne(insertObject)
Sidenote: '_id' is always added automatically to the inserted objects, you can pass it yourself(but it is recommended you don't).
```
const result = await global.db.insertOne(
  {
    collection: 'order',
    value: {
      price: 50000,
      dateCreated: new Date(),
      status: 0
    },
    edges: [
      {
        from: {
          collection: 'user',
          params: {
            username: 'mitchken
          }
        }
      },
      {
        from: {
          collection: 'product',
          params: '7T6Qdpe9ThLgu6yWJ'
        },
        edge: 'product_order'
      }
    ]
  }
);
```
> { '@class': 'order',
>   '@type': 'd',
>   price: 50000,
>   dateCreated: '2017-09-05T09:32:55.617Z',
>   status: 0,
>   _id: '59ae6f4759cacd2cac6a265c',
>   '@rid': { [String: '#97:1248'] cluster: 97, position: 1248 },
>   '@version': 1 }


## insertEdges(edgesObject)
```
const result = await global.db.insertEdges(
  [{
    from: {
      collection: 'user',
      params: {
       username: 'mitchken'
      }
    },
    to :{
      collection: 'tournament',
      params: {
        _id: 'YmTDKaxET8Rj6rSk9',
      }
    },
    edge: 'user_tournament_participating',
    content: {
      status: 1
    }
  }]
);
```
> [ { '@class': 'user_tournament_participating',
>     '@type': 'd',
>     status: 1,
>     out: { [String: '#32:3359'] cluster: 32, position: 3359 },
>     in: { [String: '#25:0'] cluster: 25, position: 0 },
>     '@rid': { [String: '#233:0'] cluster: 233, position: 0 },
>     '@version': 2 } ]

