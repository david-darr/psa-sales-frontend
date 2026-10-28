import { lazy, Suspense } from "react";
import AppLayout from "./components/AppLayout";
import "./App.css";
import { AuthProvider } from "./AuthContext";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
const Home = lazy(() => import("./Home"));
const SchoolsList = lazy(() => import("./SchoolsList"));
const SchoolWorkspace = lazy(() => import("./SchoolWorkspace"));
const SchoolFinder = lazy(() => import("./SchoolFinder"));
const Emails = lazy(() => import("./Emails"));
const Team = lazy(() => import("./Team"));
const Account = lazy(() => import("./Account"));
import ProtectedRoute from "./ProtectedRoute";
const PSAMap = lazy(() => import("./Map"));
const Tasks = lazy(() => import("./Tasks"));
const Pipeline = lazy(() => import("./Pipeline"));
const Portfolio = lazy(() => import("./Portfolio"));
const SalesAdmin = lazy(() => import("./SalesAdmin"));
const Support = lazy(() => import("./Support"));
import ErrorBoundary from "./components/ErrorBoundary";

// Page code is split per tab. Fetch it in the background once the app is idle so the
// first visit to a tab does not wait on a download.
const pageLoaders = [
  () => import("./Home"),
  () => import("./Tasks"),
  () => import("./SchoolsList"),
  () => import("./SchoolWorkspace"),
  () => import("./Pipeline"),
  () => import("./Portfolio"),
  () => import("./Emails"),
  () => import("./SchoolFinder"),
  () => import("./Map"),
  () => import("./Team"),
  () => import("./Account"),
  () => import("./SalesAdmin"),
  () => import("./Support"),
];
if (typeof window !== "undefined") {
  const warm = () => pageLoaders.forEach((load) => load().catch(() => {}));
  if ("requestIdleCallback" in window)
    window.requestIdleCallback(warm, { timeout: 4000 });
  else window.setTimeout(warm, 2500);
}

function RoutedErrorBoundary({ children }) {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <RoutedErrorBoundary>
          <Suspense
            fallback={
              <AppLayout title="Loading workspace">
                <div className="workspace-empty" role="status">
                  Loading your workspace...
                </div>
              </AppLayout>
            }
          >
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/home"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks"
                element={
                  <ProtectedRoute>
                    <Tasks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pipeline"
                element={
                  <ProtectedRoute>
                    <Pipeline />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounts"
                element={
                  <ProtectedRoute>
                    <Portfolio />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/map"
                element={
                  <ProtectedRoute>
                    <PSAMap />
                  </ProtectedRoute>
                }
              />
              <Route path="/account" element={<Account />} />
              <Route
                path="/finder"
                element={
                  <ProtectedRoute>
                    <SchoolFinder />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/schools"
                element={
                  <ProtectedRoute>
                    <SchoolsList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/schools/:id"
                element={
                  <ProtectedRoute>
                    <SchoolWorkspace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/emails"
                element={
                  <ProtectedRoute>
                    <Emails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/support"
                element={
                  <ProtectedRoute>
                    <Support />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <SalesAdmin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/team"
                element={
                  <ProtectedRoute>
                    <Team />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </RoutedErrorBoundary>
      </Router>
    </AuthProvider>
  );
}

export default App;
