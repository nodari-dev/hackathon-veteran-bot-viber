module.exports = app => {
  const records = require("../controllers/records.controller.js");

  var router = require("express").Router();

  // Create a new Record
  router.post("/", records.create);

  // Get all Records
  router.get("/", records.findAll);

  // Get all Valid Records
  router.get("/valid", records.findAllValid);

  // Get a single Record by id
  router.get("/:id", records.findOne);

  // Update a Record by id
  router.put("/:id", records.update);

  // Delete a Record by id
  router.delete("/:id", records.delete);

  // Delete all Records
  router.delete("/", records.deleteAll);

  app.use("/api/records", router);
};
