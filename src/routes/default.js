const defaultRoute = (app, mailer) => {
    app.post(`/v${process.env.APP_MAJOR_VERSION}/`, async (req, res) => {
    });
}

export default defaultRoute;