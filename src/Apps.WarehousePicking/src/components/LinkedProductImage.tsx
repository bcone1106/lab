import { useEffect, useState } from "react";
import { getClient } from "@microsoft/power-apps/data";
import { dataSourcesInfo } from "../../.power/schemas/appschemas/dataSourcesInfo";
import { useToast } from "@/hooks/use-toast";
import { errorText } from "@/utils/StockTransactions";
import { bytesToDataUrl } from "@/utils/Binary";
import { useStyles } from "@/styles/LinkedProductImage.styles";

const client = getClient(dataSourcesInfo);

export default function LinkedProductImage({ productId }: { productId: string }) {
  const styles = useStyles();
  const toast = useToast();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setImageUrl(null);
    client
      .downloadFileFromRecord("lab_products", productId, "lab_productimage")
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          toast.error(errorText(result.error));
          return;
        }
        if (result.data?.length) setImageUrl(bytesToDataUrl(result.data, "image/jpeg"));
      })
      .catch((error: unknown) => {
        if (!cancelled) toast.error(errorText(error));
      });
    return () => {
      cancelled = true;
    };
  }, [productId, toast]);

  return imageUrl ? <img src={imageUrl} alt="" className={styles.image} /> : null;
}
