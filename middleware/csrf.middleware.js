import csurf from "csurf";

export const csrfProtection = csurf({
  cookie: {
    key: "_csrf",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  },
});

export const csrfTokenHandler = (req, res) => {
  res.status(200).json({
    success: true,
    csrfToken: req.csrfToken(),
  });
};
