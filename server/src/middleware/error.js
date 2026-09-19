export function notFound(req, res) {
  res.status(404).json({ message: "Route not found." });
}

export function errorHandler(err, req, res, next) {
  req.log?.error(err);
  if (res.headersSent) return next(err);
  if (err?.name === "ZodError") {
    return res
      .status(400)
      .json({ message: "Validation failed.", errors: err.issues });
  }
  if (err?.code === "P2002") {
    return res
      .status(409)
      .json({ message: "A record with that unique value already exists." });
  }
  res.status(err.status || 500).json({
    message: err.expose ? err.message : "Something went wrong on the server.",
  });
}
