import { DEFAULT_ALLOW_LIST } from "../variables/general.js";

const CORSConfiguration = () => {
  const ALLOW_LIST =
    process.env.APP_ORIGIN.split(" ") || DEFAULT_ALLOW_LIST;
  return ALLOW_LIST;
};

export default CORSConfiguration;
