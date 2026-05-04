import { allowMethods, handleError } from "@/lib/debates/http";
import { endDebate } from "@/lib/debates/store";

export default function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;

  try {
    const { debateId } = req.query;
    const debate = endDebate(debateId);
    return res.status(200).json({ debate });
  } catch (error) {
    return handleError(res, error);
  }
}
