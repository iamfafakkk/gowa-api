import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import { Box, Paper, Stack, Typography } from "@mui/material";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export function ApiDocsPage() {
  return (
    <Stack spacing={3}>
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          border: "1px solid rgba(9, 30, 66, 0.08)",
          background:
            "radial-gradient(circle at top left, rgba(0,150,136,0.18), transparent 32%), linear-gradient(145deg, #ffffff 0%, #f2fbf8 100%)",
        }}
      >
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}
          >
            <Box>
              <Typography variant="overline" color="primary.main">
                API DOCS
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800 }}>
                Interactive OpenAPI reference
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 760, mt: 1 }}>
                Halaman ini memakai snapshot repo dari <code>docs/openapi.yaml</code> yang
                disajikan sebagai asset statis frontend, jadi dokumentasi tetap bisa dibuka tanpa
                endpoint Swagger live dari backend.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", color: "primary.main" }}>
              <MenuBookRoundedIcon />
              <AutoAwesomeRoundedIcon />
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      <Paper
        sx={{
          overflow: "hidden",
          border: "1px solid rgba(9, 30, 66, 0.08)",
          borderRadius: 5,
          bgcolor: "#ffffff",
        }}
      >
        <Box
          sx={{
            "& .swagger-ui": {
              fontFamily:
                '"Manrope", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
            },
            "& .swagger-ui .topbar": {
              display: "none",
            },
            "& .swagger-ui .info": {
              margin: 0,
              paddingTop: 24,
            },
          }}
        >
          <SwaggerUI
            url="/openapi.yaml"
            docExpansion="list"
            defaultModelsExpandDepth={-1}
            displayRequestDuration
            persistAuthorization={false}
          />
        </Box>
      </Paper>
    </Stack>
  );
}
