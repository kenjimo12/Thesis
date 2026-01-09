function validate(requiredFields = []) {
  return (req, res, next) => {
    const errors = [];

    requiredFields.forEach((field) => {
      if (
        req.body[field] === undefined ||
        req.body[field] === null ||
        String(req.body[field]).trim() === ""
      ) {
        errors.push(`${field} is required`);
      }
    });

    if (errors.length > 0) {
      res.status(400);
      return next(new Error(errors.join(", ")));
    }

    next();
  };
}

module.exports = { validate };