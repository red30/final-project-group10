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
              album: `/albums/${req.body.businessid}`
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