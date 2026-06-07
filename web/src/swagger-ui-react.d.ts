declare module "swagger-ui-react" {
  import type { ComponentType } from "react";

  export type DocExpansion = "list" | "full" | "none";

  export interface SwaggerUIProps {
    url?: string;
    spec?: object | string;
    layout?: string;
    docExpansion?: DocExpansion;
    defaultModelsExpandDepth?: number;
    displayRequestDuration?: boolean;
    persistAuthorization?: boolean;
    [key: string]: unknown;
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>;

  export default SwaggerUI;
}
