const db = require("../models");
const Record = db.records;

// Create and Save a new Record
exports.create = (req, res) => {
  // Validate request
  if (!req.body.title) {
    res.status(400).send({ message: "Content can not be empty!" });
    return;
  }

  // Create a Record
  const record = new Record({
    title: req.body.title,
    description: req.body.description,
    published: !!req.body.published,
    valid: !!req.body.valid
  });

  // Save Record in the database
  record
    .save(record)
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while creating the Record."
      });
    });
};

// Get all Records.
exports.findAll = (req, res) => {
  const title = req.query.title;
  var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};

  Record.find(condition)
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving records."
      });
    });
};

// Find a single Record by id.
exports.findOne = (req, res) => {
  const id = req.params.id;

  Record.findById(id)
    .then(data => {
      if (!data)
        res.status(404).send({ message: "Record with id " + id + " does not exist!" });
      else res.send(data);
    })
    .catch(err => {
      res
        .status(500)
        .send({ message: "Error getting Record with id " + id });
    });
};

// Update a Record by id
exports.update = (req, res) => {
  if (!req.body) {
    return res.status(400).send({
      message: "Data to update can not be empty!"
    });
  }

  const id = req.params.id;

  Record.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot update Record with id=${id}`
        });
      } else res.send({ message: "Record was updated successfully." });
    })
    .catch(err => {
      res.status(500).send({
        message: "Error updating Record with id=" + id
      });
    });
};

// Delete a Record by id
exports.delete = (req, res) => {
  const id = req.params.id;

  Record.findByIdAndRemove(id, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot delete Record with id=${id}`
        });
      } else {
        res.send({
          message: "Record was deleted successfully!"
        });
      }
    })
    .catch(err => {
      res.status(500).send({
        message: "Could not delete Record with id=" + id
      });
    });
};

// Delete all Records from the database.
exports.deleteAll = (req, res) => {
  Record.deleteMany({})
    .then(data => {
      res.send({
        message: `${data.deletedCount} Records were deleted successfully!`
      });
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while removing all records."
      });
    });
};

// Find all valid Records
exports.findAllValid = (req, res) => {
  Record.find({ valid: true })
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving records."
      });
    });
};
