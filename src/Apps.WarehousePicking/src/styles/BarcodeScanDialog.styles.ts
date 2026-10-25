import { makeStyles, tokens } from "@fluentui/react-components";

export const useStyles = makeStyles({
  content: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
  },
  video: {
    width: "100%",
    aspectRatio: "16 / 9",
    backgroundColor: "black",
    borderRadius: tokens.borderRadiusMedium,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  barcodeRow: {
    display: "flex",
    alignItems: "end",
    gap: tokens.spacingHorizontalS,
  },
  barcodeInput: {
    flex: 1,
  },
  product: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalL,
  },
  image: {
    width: "72px",
    height: "72px",
    objectFit: "contain",
    borderRadius: tokens.borderRadiusSmall,
  },
  muted: {
    color: tokens.colorNeutralForeground3,
  },
});
