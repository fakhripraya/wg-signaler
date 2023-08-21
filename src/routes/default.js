const defaultRoute = (app) => {
  app.get(
    `/v${process.env.APP_MAJOR_VERSION}/`,
    async (req, res) => {
      return res.sendStatus(200);
    }
  );
};

export default defaultRoute;
