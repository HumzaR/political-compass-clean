export function allowMethods(req, res, methods) {
  if (!methods.includes(req.method)) {
    res.setHeader("Allow", methods.join(", "));
    res.status(405).json({ error: "Method not allowed" });
    return false;
  }
  return true;
}

export function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

export function notFound(res, message = "Resource not found") {
  return res.status(404).json({ error: message });
}

export function handleError(res, error) {
  if (error?.message === "Debate not found" || error?.message === "Round not found") {
    return notFound(res, error.message);
  }
  return res.status(500).json({ error: "Internal server error" });
}
