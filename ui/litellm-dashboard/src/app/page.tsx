"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defaultOrg } from "@/components/common_components/default_org";
import { KeyResponse, Team } from "@/components/key_team_helpers/key_list";
import Navbar from "@/components/navbar";
import UserDashboard from "@/components/user_dashboard";
import ModelDashboard from "@/components/model_dashboard";
import ViewUserDashboard from "@/components/view_users";
import Teams from "@/components/teams";
import Organizations from "@/components/organizations";
import { fetchOrganizations } from "@/components/organizations";
import AdminPanel from "@/components/admins";
import Settings from "@/components/settings";
import GeneralSettings from "@/components/general_settings";
import PassThroughSettings from "@/components/pass_through_settings";
import BudgetPanel from "@/components/budgets/budget_panel";
import SpendLogsTable from "@/components/view_logs";
import ModelHub from "@/components/model_hub";
import NewUsagePage from "@/components/new_usage";
import APIRef from "@/components/api_ref";
import ChatUI from "@/components/chat_ui";
import Sidebar from "@/components/leftnav";
import Usage from "@/components/usage";
import CacheDashboard from "@/components/cache_dashboard";
import { setGlobalLitellmHeaderName } from "@/components/networking";
import { Organization } from "@/components/networking";
import GuardrailsPanel from "@/components/guardrails";
import TransformRequestPanel from "@/components/transform_request";
import { fetchUserModels } from "@/components/create_key_button";
import { fetchTeams } from "@/components/common_components/fetch_teams";
import MCPToolsViewer from "@/components/mcp_tools";
import TagManagement from "@/components/tag_management";

function getCookie(name: string) {
  const cookieValue = document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="));
  return cookieValue ? cookieValue.split("=")[1] : null;
}

function formatUserRole(userRole: string) {
  if (!userRole) {
    return "Undefined Role";
  }
  console.log(`Received user role: ${userRole.toLowerCase()}`);
  console.log(`Received user role length: ${userRole.toLowerCase().length}`);
  switch (userRole.toLowerCase()) {
    case "app_owner":
      return "App Owner";
    case "demo_app_owner":
      return "App Owner";
    case "app_admin":
      return "Admin";
    case "proxy_admin":
      return "Admin";
    case "proxy_admin_viewer":
      return "Admin Viewer";
    case "org_admin":
      return "Org Admin";
    case "internal_user":
      return "Internal User";
    case "internal_viewer":
      return "Internal Viewer";
    case "app_user":
      return "App User";
    default:
      return "Unknown Role";
  }
}

interface ProxySettings {
  PROXY_BASE_URL: string;
  PROXY_LOGOUT_URL: string;
}

const queryClient = new QueryClient();

export default function CreateKeyPage() {
  const [userRole, setUserRole] = useState("");
  const [premiumUser, setPremiumUser] = useState(false);
  const [disabledPersonalKeyCreation, setDisabledPersonalKeyCreation] =
    useState(false);
  const [userEmail, setUserEmail] = useState<null | string>(null);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [keys, setKeys] = useState<null | any[]>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [userModels, setUserModels] = useState<string[]>([]);
  const [proxySettings, setProxySettings] = useState<ProxySettings>({
    PROXY_BASE_URL: "",
    PROXY_LOGOUT_URL: "",
  });

  const [showSSOBanner, setShowSSOBanner] = useState<boolean>(true);
  const searchParams = useSearchParams()!;
  const [modelData, setModelData] = useState<any>({ data: [] });
  const [token, setToken] = useState<string | null>(null);

  const userID = searchParams.get("userID");
  const invitation_id = searchParams.get("invitation_id");

  // Get page from URL, default to 'api-keys' if not present
  const [page, setPage] = useState(() => {
    return searchParams.get("page") || "api-keys";
  });

  // Custom setPage function that updates URL
  const updatePage = (newPage: string) => {
    // Update URL without full page reload
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("page", newPage);

    // Use Next.js router to update URL
    window.history.pushState(null, "", `?${newSearchParams.toString()}`);

    setPage(newPage);
  };

  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const token = getCookie("token");
    setToken(token);
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    const decoded = jwtDecode(token) as { [key: string]: any };
    if (decoded) {
      // cast decoded to dictionary
      console.log("Decoded token:", decoded);

      console.log("Decoded key:", decoded.key);
      // set accessToken
      setAccessToken(decoded.key);

      setDisabledPersonalKeyCreation(
        decoded.disabled_non_admin_personal_key_creation,
      );

      // check if userRole is defined
      if (decoded.user_role) {
        const formattedUserRole = formatUserRole(decoded.user_role);
        console.log("Decoded user_role:", formattedUserRole);
        setUserRole(formattedUserRole);
        if (formattedUserRole == "Admin Viewer") {
          setPage("usage");
        }
      } else {
        console.log("User role not defined");
      }

      if (decoded.user_email) {
        setUserEmail(decoded.user_email);
      } else {
        console.log(`User Email is not set ${decoded}`);
      }

      if (decoded.login_method) {
        setShowSSOBanner(
          decoded.login_method == "username_password" ? true : false,
        );
      } else {
        console.log(`User Email is not set ${decoded}`);
      }

      if (decoded.premium_user) {
        setPremiumUser(decoded.premium_user);
      }

      if (decoded.auth_header_name) {
        setGlobalLitellmHeaderName(decoded.auth_header_name);
      }
    }
  }, [token]);
  
  useEffect(() => {
    if (accessToken && userID && userRole) {
      fetchUserModels(userID, userRole, accessToken, setUserModels);
    }
    if (accessToken && userID && userRole) {
      fetchTeams(accessToken, userID, userRole, null, setTeams);
    }
    if (accessToken) {
      fetchOrganizations(accessToken, setOrganizations);
    }
  }, [accessToken, userID, userRole]);


  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QueryClientProvider client={queryClient}>
        {invitation_id ? (
          <UserDashboard
            userID={userID}
            userRole={userRole}
            premiumUser={premiumUser}
            teams={teams}
            keys={keys}
            setUserRole={setUserRole}
            userEmail={userEmail}
            setUserEmail={setUserEmail}
            setTeams={setTeams}
            setKeys={setKeys}
            organizations={organizations}
          />
        ) : (
          <div className="flex flex-col min-h-screen">
            <Navbar
              userID={userID}
              userRole={userRole}
              premiumUser={premiumUser}
              userEmail={userEmail}
              setProxySettings={setProxySettings}
              proxySettings={proxySettings}
              accessToken={accessToken}
            />
            <div className="flex flex-1 overflow-auto">
              <div className="mt-8">
                <Sidebar
                  setPage={updatePage}
                  userRole={userRole}
                  defaultSelectedKey={page}
                />
              </div>

              {page == "api-keys" ? (
                <UserDashboard
                  userID={userID}
                  userRole={userRole}
                  premiumUser={premiumUser}
                  teams={teams}
                  keys={keys}
                  setUserRole={setUserRole}
                  userEmail={userEmail}
                  setUserEmail={setUserEmail}
                  setTeams={setTeams}
                  setKeys={setKeys}
                  organizations={organizations}
                />
              ) : page == "models" ? (
                <ModelDashboard
                  userID={userID}
                  userRole={userRole}
                  token={token}
                  keys={keys}
                  accessToken={accessToken}
                  modelData={modelData}
                  setModelData={setModelData}
                  premiumUser={premiumUser}
                  teams={teams}
                />
              ) : page == "llm-playground" ? (
                <ChatUI
                  userID={userID}
                  userRole={userRole}
                  token={token}
                  accessToken={accessToken}
                  disabledPersonalKeyCreation={disabledPersonalKeyCreation}
                />
              ) : page == "users" ? (
                <ViewUserDashboard
                  userID={userID}
                  userRole={userRole}
                  token={token}
                  keys={keys}
                  teams={teams}
                  accessToken={accessToken}
                  setKeys={setKeys}
                />
              ) : page == "teams" ? (
                <Teams
                  teams={teams}
                  setTeams={setTeams}
                  searchParams={searchParams}
                  accessToken={accessToken}
                  userID={userID}
                  userRole={userRole}
                  organizations={organizations}
                />
              ) : page == "organizations" ? (
                <Organizations
                  organizations={organizations}
                  setOrganizations={setOrganizations}
                  userModels={userModels}
                  accessToken={accessToken}
                  userRole={userRole}
                  premiumUser={premiumUser}
                />
              ) : page == "admin-panel" ? (
                <AdminPanel
                  setTeams={setTeams}
                  searchParams={searchParams}
                  accessToken={accessToken}
                  showSSOBanner={showSSOBanner}
                  premiumUser={premiumUser}
                />
              ) : page == "api_ref" ? (
                <APIRef proxySettings={proxySettings} />
              ) : page == "settings" ? (
                <Settings
                  userID={userID}
                  userRole={userRole}
                  accessToken={accessToken}
                  premiumUser={premiumUser}
                />
              ) : page == "budgets" ? (
                <BudgetPanel accessToken={accessToken} />
              ) : page == "guardrails" ? (
                <GuardrailsPanel accessToken={accessToken} />
              ): page == "general-settings" ? (
                <GeneralSettings
                  userID={userID}
                  userRole={userRole}
                  accessToken={accessToken}
                  modelData={modelData}
                />
              ) : page == "model-hub" ? (
                <ModelHub
                  accessToken={accessToken}
                  publicPage={false}
                  premiumUser={premiumUser}
                />
              ) : page == "caching" ? (
                <CacheDashboard
                  userID={userID}
                  userRole={userRole}
                  token={token}
                  accessToken={accessToken}
                  premiumUser={premiumUser}
                />
              ) : page == "pass-through-settings" ? (
                <PassThroughSettings
                  userID={userID}
                  userRole={userRole}
                  accessToken={accessToken}
                  modelData={modelData}
                />
              ) : page == "logs" ? (
                <SpendLogsTable
                  userID={userID}
                  userRole={userRole}
                  token={token}
                  accessToken={accessToken}
                  allTeams={teams as Team[] ?? []}
                />
              ) : page == "mcp-tools" ? (
                <MCPToolsViewer
                  accessToken={accessToken}
                  userRole={userRole}
                  userID={userID}
                />
              ) : page == "tag-management" ? (
                <TagManagement
                  accessToken={accessToken}
                  userRole={userRole}
                  userID={userID}
                />
              ) : page == "new_usage" ? (
                <NewUsagePage
                  userID={userID}
                  userRole={userRole}
                  accessToken={accessToken}
                />
              ) : 
              (
                <Usage
                  userID={userID}
                  userRole={userRole}
                  token={token}
                  accessToken={accessToken}
                  keys={keys}
                  premiumUser={premiumUser}
                />
              )}
            </div>
          </div>
        )}
      </QueryClientProvider>
    </Suspense>
  );
}
