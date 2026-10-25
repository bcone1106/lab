import { makeStyles, tokens } from "@fluentui/react-components";

export const useStyles = makeStyles({
  image: {
    width: "48px",
    height: "48px",
    objectFit: "contain",
    borderRadius: tokens.borderRadiusSmall,
  },
});
