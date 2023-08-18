const voipRoute = (app) => {
  // GET method route
  app.get(
    `/v${process.env.APP_MAJOR_VERSION}/room/check`,
    (req, res) => {}
  );

  // POST method route
  app.post(
    `/v${process.env.APP_MAJOR_VERSION}/room/create`,
    (req, res) => {}
  );
};

export default voipRoute;
