const { notarize } = require("@electron/notarize");
const dotenv = require("dotenv");

dotenv.config();
exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") return;

  const appName = context.packager.appInfo.productFilename;
  try {
    return await notarize({
      tool: "notarytool",
      appPath: `${appOutDir}/${appName}.app`,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.CSC_TEAM_ID
    });
  } catch (error) {
    console.error(error);
  }
};
