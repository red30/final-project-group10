const router = require('express').Router();
const validation = require('../lib/validation');
const { getPhotosByAlbumID } = require('./photos');

/*
 * Schema describing required/optional fields of a album object.
 */
const albumSchema = {
  ownerid: { required: true },
  name: { required: true },
  date: { required: true },
  email: { required: false }
};

/*
 * Executes a MySQL query to fetch the total number of albums.  Returns
 * a Promise that resolves to this count.
 */
function getAlbumsCount(mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query('SELECT COUNT(*) AS count FROM albums', function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results[0].count);
      }
    });
  });
}

/*
 * Executes a MySQL query to return a single page of albums.  Returns a
 * Promise that resolves to an array containing the fetched page of albums.
 */
function getAlbumsPage(page, totalCount, mysqlPool) {
  return new Promise((resolve, reject) => {
    /*
     * Compute last page number and make sure page is within allowed bounds.
     * Compute offset into collection.
     */
    const numPerPage = 10;
    const lastPage = Math.max(Math.ceil(totalCount / numPerPage), 1);
    page = page < 1 ? 1 : page;
    page = page > lastPage ? lastPage : page;
    const offset = (page - 1) * numPerPage;

    mysqlPool.query(
      'SELECT * FROM albums ORDER BY id LIMIT ?,?',
      [ offset, numPerPage ],
      function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve({
            albums: results,
            pageNumber: page,
            totalPages: lastPage,
            pageSize: numPerPage,
            totalCount: totalCount
          });
        }
      }
    );
  });
}

/*
 * Route to return a paginated list of albums.
 */
router.get('/', function (req, res) {
  const mysqlPool = req.app.locals.mysqlPool;
  getAlbumsCount(mysqlPool)
    .then((count) => {
      return getAlbumsPage(parseInt(req.query.page) || 1, count, mysqlPool);
    })
    .then((albumsPageInfo) => {
      /*
       * Generate HATEOAS links for surrounding pages and then send response.
       */
      albumsPageInfo.links = {};
      let { links, pageNumber, totalPages } = albumsPageInfo;
      if (pageNumber < totalPages) {
        links.nextPage = `/albums?page=${pageNumber + 1}`;
        links.lastPage = `/albums?page=${totalPages}`;
      }
      if (pageNumber > 1) {
        links.prevPage = `/albums?page=${pageNumber - 1}`;
        links.firstPage = '/albums?page=1';
      }
      res.status(200).json(albumsPageInfo);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({
        error: "Error fetching albums list.  Please try again later."
      });
    });
});

/*
 * Executes a MySQL query to insert a new album into the database.  Returns
 * a Promise that resolves to the ID of the newly-created album entry.
 */
function insertNewAlbum(album, mysqlPool) {
  return new Promise((resolve, reject) => {
    album = validation.extractValidFields(album, albumSchema);
    album.id = null;
    mysqlPool.query(
      'INSERT INTO albums SET ?',
      album,
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
 * Route to create a new album.
 */
router.post('/', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  if (validation.validateAgainstSchema(req.body, albumSchema)) {
    insertNewAlbum(req.body, mysqlPool)
      .then((id) => {
        res.status(201).json({
          id: id,
          links: {
            album: `/albums/${id}`
          }
        });
      })
      .catch((err) => {
        res.status(500).json({
          error: "Error inserting album into DB.  Please try again later."
        });
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid album object."
    });
  }
});

/*
 * Executes a MySQL query to fetch information about a single specified
 * album based on its ID.  Returns a Promise that resolves to an object
 * containing information about the requested album.  If no album with
 * the specified ID exists, the returned Promise will resolve to null.
 */
function getAlbumByID(albumID, mysqlPool) {
  /*
   * Execute three sequential queries to get all of the info about the
   * specified album, including its reviews and photos.  If the original
   * request to fetch the album doesn't match a album, send null through
   * the promise chain.
   */
  let returnAlbum = {};
  return new Promise((resolve, reject) => {
    mysqlPool.query('SELECT * FROM albums WHERE id = ?', [ albumID ], function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results[0]);
      }
    });
  }).then((album) => {
    if (album) {
      returnAlbum = album;
      return getReviewsByAlbumID(albumID, mysqlPool);
    } else {
      return Promise.resolve(null);
    }
  }).then((reviews) => {
    if (reviews) {
      returnAlbum.reviews = reviews;
      return getPhotosByAlbumID(albumID, mysqlPool);
    } else {
      return Promise.resolve(null);
    }
  }).then((photos) => {
    if (photos) {
      returnAlbum.photos = photos;
      return Promise.resolve(returnAlbum);
    } else {
      return Promise.resolve(null);
    }
  })
}

/*
 * Route to fetch info about a specific album.
 */
router.get('/:albumID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const albumID = parseInt(req.params.albumID);
  getAlbumByID(albumID, mysqlPool)
    .then((album) => {
      if (album) {
        res.status(200).json(album);
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to fetch album.  Please try again later."
      });
    });
});

/*
 * Executes a MySQL query to replace a specified album with new data.
 * Returns a Promise that resolves to true if the album specified by
 * `albumID` existed and was successfully updated or to false otherwise.
 */
function replaceAlbumByID(albumID, album, mysqlPool) {
  return new Promise((resolve, reject) => {
    album = validation.extractValidFields(album, albumSchema);
    mysqlPool.query('UPDATE albums SET ? WHERE id = ?', [ album, albumID ], function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });
}

/*
 * Route to replace data for a album.
 */
router.put('/:albumID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const albumID = parseInt(req.params.albumID);
  if (validation.validateAgainstSchema(req.body, albumSchema)) {
    replaceAlbumByID(albumID, req.body, mysqlPool)
      .then((updateSuccessful) => {
        if (updateSuccessful) {
          res.status(200).json({
            links: {
              album: `/albums/${albumID}`
            }
          });
        } else {
          next();
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({
          error: "Unable to update specified album.  Please try again later."
        });
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid album object"
    });
  }
});

/*
 * Executes a MySQL query to delete a album specified by its ID.  Returns
 * a Promise that resolves to true if the album specified by `albumID`
 * existed and was successfully deleted or to false otherwise.
 */
function deleteAlbumByID(albumID, mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query('DELETE FROM albums WHERE id = ?', [ albumID ], function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });

}

/*
 * Route to delete a album.
 */
router.delete('/:albumID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const albumID = parseInt(req.params.albumID);
  deleteAlbumByID(albumID, mysqlPool)
    .then((deleteSuccessful) => {
      if (deleteSuccessful) {
        res.status(204).end();
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to delete album.  Please try again later."
      });
    });
});

/*
 * Executes a MySQL query to fetch all albums owned by a specified user,
 * based on on the user's ID.  Returns a Promise that resolves to an array
 * containing the requested albums.  This array could be empty if the
 * specified user does not own any albums.  This function does not verify
 * that the specified user ID corresponds to a valid user.
 */
function getAlbumsByOwnerID(userID, mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT * FROM albums WHERE ownerid = ?',
      [ userID ],
      function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      }
    );
  });
}

exports.router = router;
exports.getAlbumsByOwnerID = getAlbumsByOwnerID;
