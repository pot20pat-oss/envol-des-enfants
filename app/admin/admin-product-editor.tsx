import type { Dispatch, SetStateAction } from "react";
import type { Row } from "./admin-shared";
import {
  ProductDetailsFields,
  ProductIdentityFields,
  ProductMarketFields,
  ProductMediaAndTermsFields,
} from "./admin-product-editor-sections";

type ProductEditorProps = {
  editing: Row;
  setEditing: Dispatch<SetStateAction<Row | null>>;
  update: (field: string, value: string | number | boolean) => void;
  upload: (file?: File) => void | Promise<void>;
};

export function ProductEditor({ editing, setEditing, update, upload }: ProductEditorProps) {
  return (
    <>
      <ProductIdentityFields editing={editing} setEditing={setEditing} update={update} />
      <ProductMarketFields editing={editing} update={update} />
      <ProductDetailsFields editing={editing} update={update} />
      <ProductMediaAndTermsFields editing={editing} update={update} upload={upload} />
    </>
  );
}
