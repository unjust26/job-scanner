import { Toaster } from "sonner";
import { JobScannerPage } from "./pages/JobScannerPage";

function App() {
  return (
    <>
      <Toaster richColors position="top-center" theme="light" />
      <JobScannerPage />
    </>
  );
}

export default App;
