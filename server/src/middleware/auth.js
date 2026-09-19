import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma.js";

export async function authenticate(req, res, next) {
  try {
    const cookieName = process.env.COOKIE_NAME || "fc27_session";
    const token = req.cookies?.[cookieName];
    if (!token)
      return res.status(401).json({ message: "Authentication required." });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { customerProfile: true },
    });
    if (!user || user.status !== "ACTIVE") {
      return res
        .status(401)
        .json({ message: "Account is inactive or unavailable." });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired session." });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "You do not have permission for this action." });
    }
    next();
  };
}
