const router = require('express').Router();
const validation = require('../lib/validation');

/*
 * Schema describing required/optional fields of a photo object.
 */
const photoSchema = {
  userid: { required: true },
  albumid: { required: true },
  caption: { required: false },
  data: { required: true }
};

/*
 * Executes a MySQL query to insert a new photo into the database.  Returns
 * a Promise that resolves to the ID of the newly-created photo entry.
 */
function insertNewPhoto(photo, mysqlPool) {
    return new Promise((resolve, reject) => {
      photo = validation.extractValidFields(photo, photoSchema);
      photo.id = null;
      mysqlPool.query(
        'INSERT INTO photos SET ?',
        photo,
        function (err, result) {
          if (err) {
            reject(err);
          } else {
            resolve(result.insertId);
          }
        }
      );
    });
  }

/*
 * Route to create a new photo.
 */
router.post('/', function (req, res, next) {
    const mysqlPool = req.app.locals.mysqlPool;
    if (validation.validateAgainstSchema(req.body, photoSchema)) {
      insertNewPhoto(req.body, mysqlPool)
        .then((id) => {
          res.status(201).json({
            id: id,
            links: {
              photo: `/photos/${id}`,
              album: `/albums/${req.body.albumid}`
            }
          });
        })
        .catch((err) => {
          res.status(500).json({
            error: "Error inserting photo into DB.  Please try again later."
          });
        });
    } else {
      res.status(400).json({
        error: "Request body is not a valid photo object"
      });
    }
  });


/*
 * Executes a MySQL query to fetch a single specified photo based on its ID.
 * Returns a Promise that resolves to an object containing the requested
 * photo.  If no photo with the specified ID exists, the returned Promise
 * will resolve to null.
 */
function getPhotoByID(photoID, mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query('SELECT * FROM photos WHERE id = ?', [ photoID ], function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results[0]);
      }
    });
  });
}

/*
 * Route to fetch info about a specific photo.
 */
router.get('/:photoID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const photoID = parseInt(req.params.photoID);
  getPhotoByID(photoID, mysqlPool)
    .then((photo) => {
      if (photo) {
        res.status(200).json(photo);
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to fetch photo.  Please try again later."
      });
    });
});


/*
 * Executes a MySQL query to replace a specified photo with new data.
 * Returns a Promise that resolves to true if the photo specified by
 * `photoID` existed and was successfully updated or to false otherwise.
 */
function replacePhotoByID(photoID, photo, mysqlPool) {
  return new Promise((resolve, reject) => {
    photo = validation.extractValidFields(photo, photoSchema);
    mysqlPool.query('UPDATE photos SET ? WHERE id = ?', [ photo, photoID ], function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });
}

/*
 * Route to update a photo.
 */
router.put('/:photoID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const photoID = parseInt(req.params.photoID);
  if (validation.validateAgainstSchema(req.body, photoSchema)) {
    let updatedPhoto = validation.extractValidFields(req.body, photoSchema);
    /*
     * Make sure the updated photo has the same albumsID and userID as
     * the existing photo.  If it doesn't, respond with a 403 error.  If the
     * photo doesn't already exist, respond with a 404 error.
     */
    getPhotoByID(photoID, mysqlPool)
      .then((existingPhoto) => {
        if (existingPhoto) {
          if (updatedPhoto.albumid === existingPhoto.albumid && updatedPhoto.userid === existingPhoto.userid) {
            return replacePhotoByID(photoID, updatedPhoto, mysqlPool);
          } else {
            return Promise.reject(403);
          }
        } else {
          next();
        }
      })
      .then((updateSuccessful) => {
        if (updateSuccessful) {
          res.status(200).json({
            links: {
              album: `/albums/${updatedPhoto.albumid}`,
              photo: `/photos/${photoID}`
            }
          });
        } else {
          next();
        }
      })
      .catch((err) => {
        if (err === 403) {
          res.status(403).json({
            error: "Updated photo must have the same albumid and userID"
          });
        } else {
          res.status(500).json({
            error: "Unable to update photo.  Please try again later."
          });
        }
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid photo object."
    });
  }
});
