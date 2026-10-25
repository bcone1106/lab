import { useEffect, useRef, useState } from "react";
import { getClient } from "@microsoft/power-apps/data";
import {
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
} from "@fluentui/react-components";
import { BarcodeScannerRegular } from "@fluentui/react-icons";
import { OpenFoodFactsService } from "@/generated/services/OpenFoodFactsService";
import type { Product } from "@/generated/models/OpenFoodFactsModel";
import { useBarcodeCamera } from "@/hooks/UseBarcodeCamera";
import { useToast } from "@/hooks/use-toast";
import { useStyles } from "@/styles/BarcodeScanDialog.styles";
import { bytesToDataUrl, toBytes } from "@/utils/Binary";
import { ensureProductRecord } from "@/utils/BarcodeLookup";
import { eanError } from "@/utils/Barcode";
import { servicePayload, serviceResult } from "@/utils/ServicePayload";
import { errorText } from "@/utils/StockTransactions";
import { Lab_warehouseitemsService } from "@/generated/services/Lab_warehouseitemsService";
import { dataSourcesInfo } from "../../.power/schemas/appschemas/dataSourcesInfo";

const client = getClient(dataSourcesInfo);

type Props = {
  itemId: string;
  currentProductId?: string;
  onLinked: () => void;
};

export default function BarcodeScanDialog({ itemId, currentProductId, onLinked }: Props) {
  const styles = useStyles();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageBytes, setImageBytes] = useState<Uint8Array | null>(null);
  const [imageFetchFailed, setImageFetchFailed] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [linking, setLinking] = useState(false);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const foundRef = useRef(false);
  const validationMessage = eanError(barcode);

  useEffect(() => {
    if (open) foundRef.current = false;
  }, [open]);

  const lookUp = async (value: string) => {
    const ean = value.trim();
    if (!ean || eanError(ean)) return;
    setLooking(true);
    setLookupError(null);
    setProduct(null);
    setPreviewImage(null);
    setImageBytes(null);
    setImageFetchFailed(false);
    foundRef.current = false;
    try {
      const result = await serviceResult(OpenFoodFactsService.GetProductByBarcode(ean));
      if (!result.data) {
        setLookupError("No product found for this barcode");
        return;
      }
      setProduct(result.data);
      foundRef.current = true;
      if (result.data.imageUrl) {
        try {
          const imageResult = await serviceResult(OpenFoodFactsService.GetProductImage(result.data.imageUrl));
          const bytes = toBytes(imageResult.data);
          if (bytes) {
            setImageBytes(bytes);
            setPreviewImage(bytesToDataUrl(bytes, "image/jpeg"));
          } else {
            setImageFetchFailed(true);
          }
        } catch {
          setImageFetchFailed(true);
        }
      }
    } catch (error) {
      const message = errorText(error);
      setLookupError(message.includes("No product found for this barcode")
        ? "No product found for this barcode"
        : message);
    } finally {
      setLooking(false);
    }
  };

  const cameraStatus = useBarcodeCamera(video, open, (value) => {
    if (foundRef.current) return;
    setBarcode(value);
    void lookUp(value);
  });

  const close = () => {
    setOpen(false);
    setBarcode("");
    setProduct(null);
    setPreviewImage(null);
    setImageBytes(null);
    setImageFetchFailed(false);
    setLookupError(null);
  };

  const linkToItem = async () => {
    if (!product) return;
    setLinking(true);
    try {
      const productId = await ensureProductRecord(barcode.trim(), product);
      if (!productId) {
        toast.error("Could not resolve a Product record to link");
        return;
      }

      await serviceResult(Lab_warehouseitemsService.update(itemId, servicePayload({
        "lab_productid@odata.bind": `/lab_products(${productId})`,
      })));

      if (imageBytes) {
        try {
          const result = await client.uploadFileToRecord(
            "lab_products",
            productId,
            "lab_productimage",
            `${barcode.trim()}.jpg`,
            imageBytes
          );
          if (!result.success) throw new Error(result.error?.message || "Image upload failed");
        } catch (error) {
          toast.error(`Product linked, but image failed to save: ${errorText(error)}`);
        }
      } else if (product.imageUrl && imageFetchFailed) {
        toast.error("Product linked, but image failed to save.");
      }

      toast.success("Product linked to item");
      onLinked();
      close();
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setLinking(false);
    }
  };

  return (
    <>
      <Button
        appearance="outline"
        size="small"
        icon={<BarcodeScannerRegular />}
        data-testid="scan-barcode-button"
        onClick={() => setOpen(true)}
      >
        {currentProductId ? "Rescan Barcode" : "Scan Barcode"}
      </Button>
      <Dialog open={open} onOpenChange={(_, data) => data.open ? setOpen(true) : close()}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Scan Product Barcode</DialogTitle>
            <DialogContent className={styles.content}>
              <video ref={setVideo} className={styles.video} muted autoPlay playsInline />
              <Text size={200}>
                {cameraStatus === "unavailable"
                  ? "Camera unavailable. Type the barcode below."
                  : "Scan a barcode or enter it below."}
              </Text>
              <Field
                label="Barcode"
                validationState={validationMessage ? "error" : "none"}
                validationMessage={validationMessage}
              >
                <div className={styles.barcodeRow}>
                  <Input
                    className={styles.barcodeInput}
                    value={barcode}
                    placeholder="e.g. 3017620422003"
                    data-testid="scan-ean-input"
                    onChange={(_, data) => {
                      setBarcode(data.value);
                      setProduct(null);
                      setLookupError(null);
                    }}
                  />
                  <Button
                    appearance="primary"
                    data-testid="scan-lookup-button"
                    disabled={!barcode || !!validationMessage || looking}
                    onClick={() => void lookUp(barcode)}
                  >
                    {looking ? <Spinner size="tiny" /> : "Look Up"}
                  </Button>
                </div>
              </Field>
              {lookupError && (
                <MessageBar intent="error">
                  <MessageBarBody>{lookupError}</MessageBarBody>
                </MessageBar>
              )}
              {product && (
                <Card className={styles.product}>
                  {previewImage && <img src={previewImage} alt={product.name ?? barcode} className={styles.image} />}
                  <div>
                    <Text weight="semibold" data-testid="scan-product-name">{product.name || "Unknown product"}</Text>
                    <Text className={styles.muted} block>{[product.brand, product.quantity].filter(Boolean).join(" · ")}</Text>
                  </div>
                </Card>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={close}>Cancel</Button>
              <Button
                appearance="primary"
                data-testid="scan-link-button"
                disabled={!product || linking}
                onClick={() => void linkToItem()}
              >
                {linking ? <Spinner size="tiny" /> : "Link to Item"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
}
