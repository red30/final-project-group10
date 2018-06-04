const router = require('express').Router();
const bcrypt = require('bcryptjs');
const ObjectId = require('mongodb').ObjectId;

const { generateAuthToken, requireAuthentication } = require('../lib/auth');

const { getBusinessesByOwnerID } = require('./businesses');
const { getReviewsByUserID } = require('./reviews');
const { getPhotosByUserID } = require('./photos');

function validateUserObject(user) {
  return user && user.userID && user.email && user.password;
}

function insertNewUser(user, mongoDB) {
  return bcrypt.hash(user.password, 8)
    .then((passwordHash) => {
      const userDocument = {
        userID: user.userID,
        email: user.email,
        password: passwordHash,
        businesses: [],
	photos: [],
	reviews: []
      };
      const usersCollection = mongoDB.collection('users');
      return usersCollection.insertOne(userDocument);
    })
    .then((result) => {
      return Promise.resolve(result.insertedId);
    });
}

function getUserByID(userID, mongoDB, includePassword) {
  const usersCollection = mongoDB.collection('users');
  const projection = includePassword ? {} : { password: 0 };
  console.log("== getting user", userID);
  return usersCollection
    .find({ userID: userID })
    .project(projection)
    .toArray()
    .then((results) => {
      return Promise.resolve(results[0]);
    });
}

router.post('/', function (req, res) {
  const mongoDB = req.app.locals.mongoDB;
  if (validateUserObject(req.body)) {
	getUserByID(req.body.userID, mongoDB, false)	// test to see if username exists; likely redundant
		.then((user) => {
			if (user) {
				res.status(403).json({
					error: "Requested username is already exists in database. Please try another."
				})
			} else {
				insertNewUser(req.body, mongoDB)
					.then((id) => {
						res.status(201).json({
							_id: id,
							links: {
								user: `/users/${id}`
							}
						});
					})
			}
		})
      .catch((err) => {
        res.status(500).json({
          error: "Failed to insert new user."
        });
      });
  } else {
    res.status(400).json({
      error: "Request doesn't contain a valid user."
    })
  }
});

router.post('/login', function (req, res) {
  const mongoDB = req.app.locals.mongoDB;
  if (req.body && req.body.userID && req.body.password) {
    getUserByID(req.body.userID, mongoDB, true)
      .then((user) => {
        if (user) {
		//console.log("== user found");
          return bcrypt.compare(req.body.password, user.password);
        } else {
		//console.log("== user NOT found", req.body.userID);
          return Promise.reject(401);
        }
      })
      .then((loginSuccessful) => {
        if (loginSuccessful) {
		//console.log("== login successful");
          return generateAuthToken(req.body.userID);
        } else {
		//console.log("== login NOT successful", req.body.password);
          return Promise.reject(401);
        }
      })
      .then((token) => {
        res.status(200).json({
          token: token
        });
      })
      .catch((err) => {
        console.log(err);
        if (err === 401) {
          res.status(401).json({
            error: "Invalid credentials."
          });
        } else {
          res.status(500).json({
            error: "Failed to fetch user."
          });
        }
      });
  } else {
    res.status(400).json({
      error: "Request needs a user ID and password."
    })
  }
});

router.get('/:userID', requireAuthentication, function (req, res, next) {
  const mongoDB = req.app.locals.mongoDB;
  if (req.user !== req.params.userID) {
    res.status(403).json({
      error: "Unauthorized to access that resource"
    });
  } else {
    getUserByID(req.params.userID, mongoDB)
      .then((user) => {
        if (user) {
          res.status(200).json(user);
        } else {
          next();
        }
      })
      .catch((err) => {
        res.status(500).json({
          error: "Failed to fetch user."
        });
      });
  }
});

/*
 * Route to retrieve a listing of all of a given user's albums
 */
router.get('/:userID/albums', requireAuthentication, function (req, res, next) {
	const mongoDB = req.app.locals.mongoDB;
	const mysqlPool = req.app.locals.mysqlPool;
	if (req.user !== req.params.userID) {
		res.status(403).json({
			error: "Unauthorized to access that resource"
		});
	} else {
		getAlbumsByOwnerID(req.params.userID, mysqlPool)
			.then((albums) => {
				if (albums) {
					res.status(200).json({ albums: albums });
				} else {
					next();
				}
			})
			.catch((err) => {
				res.status(500).json({
					error: "Unable to fetch albums.  Please try again later."
				});
			});
	}
});

/*
 * Route to retrieve a listing of all of a given user's albums
 */
router.get('/:userID/photos', requireAuthentication, function (req, res, next) {
	const mongoDB = req.app.locals.mongoDB;
	const mysqlPool = req.app.locals.mysqlPool;
	if (req.user !== req.params.userID) {
		res.status(403).json({
			error: "Unauthorized to access that resource"
		});
	} else {
		getPhotosByUserID(req.params.userID, mysqlPool)
			.then((photos) => {
				if (photos) {
					res.status(200).json({ photos: photos });
				} else {
					next();
				}
			})
			.catch((err) => {
				res.status(500).json({
					error: "Unable to fetch photos.  Please try again later."
				});
			});
	}
});

/*
 * Function that allows other endpoints to add a Photo to a user object
 */
function addPhotoToUser(photoID, userID, mongoDB) {
  const usersCollection = mongoDB.collection('users');
  return usersCollection.updateOne(
    { userID: userID },
    { $push: { photos: photoID } }
  ).then(() => {
    return Promise.resolve(photoID);
  });
}

/*
 * Function that allows other endpoints to add an Album to a user object
 */
function addAlbumToUser(albumID, userID, mongoDB) {
  const usersCollection = mongoDB.collection('users');
  return usersCollection.updateOne(
    { userID: userID },
    { $push: { photos: albumID } }
  ).then(() => {
    return Promise.resolve(albumID);
  });
}

exports.router = router;
exports.addPhotoToUser = addPhotoToUser;
exports.addAlbumToUser = addAlbumToUser;
