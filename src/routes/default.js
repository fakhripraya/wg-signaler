const defaultRoute = (app) => {
  app.get(`/v1/`, async (req, res) => {
    return res.sendStatus(200);
  });
};

export default defaultRoute;
