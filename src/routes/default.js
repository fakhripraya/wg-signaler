const defaultRoute = (app) => {
  app.post(
    `/v${process.env.APP_MAJOR_VERSION}/`,
    async (req, res) => {
      return res.sendStatus(200);
    }
  );
};

export default defaultRoute;
