/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Database, 
  UserPlus, 
  LogOut, 
  Upload, 
  Phone, 
  CheckCircle, 
  Flame, 
  Trash2, 
  FileSpreadsheet,
  ChevronRight,
  Plus,
  Info,
  User as UserIcon,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Safer confirmation within iframe
const modalConfirm = (msg: string) => {
  return window.confirm(msg);
};

// Types
interface Customer {
  id: string;
  name: string;
  mobile: string;
  remarks: string;
  status: "unallocated" | "allocated" | "good" | "hot" | "dump";
  employeeId?: string;
  processedBy?: string;
  createdAt: number;
}

interface LeadRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  timestamp: number;
  status: "pending" | "accepted" | "rejected";
  assignmentMessage?: string;
}

interface Employee {
  id: string;
  name: string;
  username: string;
  password?: string;
  mobile: string;
  status: "active" | "inactive";
  allocatedCount: number;
}

type UserRole = "admin" | "employee" | null;

export default function App() {
  const [role, setRole] = useState<UserRole>(null);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState("database");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<LeadRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initial Data Fetch & Periodic Sync
  useEffect(() => {
    fetchData(); // Initial load for login screen
    const interval = setInterval(() => {
      fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [custRes, empRes, reqRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/employees"),
        fetch("/api/requests")
      ]);
      const custData = await custRes.json();
      const empData = await empRes.json();
      const reqData = await reqRes.json();
      setCustomers(custData);
      setEmployees(empData);
      setRequests(reqData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setRole(null);
    setCurrentUser(null);
    setCustomers([]);
    setEmployees([]);
  };

  if (!role) {
    return <Login onLogin={(r, user) => { 
      setRole(r); 
      if(user) {
        setCurrentUser(user);
        setActiveTab("allocated");
      } else {
        setActiveTab("database");
      }
    }} fetchEmployees={fetchData} />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Nav */}
      <aside className="w-56 bg-slate-900 flex flex-col shrink-0 text-slate-300">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white">L</div>
          <span className="font-semibold text-white tracking-tight">LeadFlow {role === "admin" ? "Admin" : "Staff"}</span>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {role === "admin" ? (
            <>
              <SidebarItem 
                icon={<Database />} 
                label="Database" 
                active={activeTab === "database"} 
                onClick={() => setActiveTab("database")} 
                count={customers.filter(c => c.status === "unallocated").length}
              />
              <SidebarItem 
                icon={<RefreshCw />} 
                label="Lead Requests" 
                active={activeTab === "requests"} 
                onClick={() => setActiveTab("requests")} 
                count={(requests || []).filter(r => r.status === "pending").length}
              />
              <SidebarItem 
                icon={<Users />} 
                label="Employees" 
                active={activeTab === "employees"} 
                onClick={() => setActiveTab("employees")} 
                count={employees.length}
              />
              <div className="mt-6 px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Categories</div>
              <SidebarItem 
                icon={<Flame className="text-red-400" />} 
                label="Hot Leads" 
                active={activeTab === "hot"} 
                onClick={() => setActiveTab("hot")} 
                count={customers.filter(c => c.status === "hot").length}
              />
              <SidebarItem 
                icon={<CheckCircle className="text-emerald-400" />} 
                label="Good Profiles" 
                active={activeTab === "good"} 
                onClick={() => setActiveTab("good")} 
                count={customers.filter(c => c.status === "good").length}
              />
              <SidebarItem 
                icon={<Trash2 className="text-slate-500" />} 
                label="Dumped" 
                active={activeTab === "dump"} 
                onClick={() => setActiveTab("dump")} 
                count={customers.filter(c => c.status === "dump").length}
              />
            </>
          ) : (
            <>
              <SidebarItem 
                icon={<Database />} 
                label="My Allocation" 
                active={activeTab === "allocated"} 
                onClick={() => setActiveTab("allocated")} 
                count={customers.filter(c => c.status === "allocated" && c.employeeId === currentUser?.id).length}
              />
              <div className="mt-6 px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">My Progress</div>
              <SidebarItem 
                icon={<Flame className="text-red-400" />} 
                label="My Hot Leads" 
                active={activeTab === "my-hot"} 
                onClick={() => setActiveTab("my-hot")} 
              />
              <SidebarItem 
                icon={<CheckCircle className="text-emerald-400" />} 
                label="My Good Profiles" 
                active={activeTab === "my-good"} 
                onClick={() => setActiveTab("my-good")} 
              />
            </>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold">
              {role === "admin" ? "AD" : currentUser?.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="text-[10px] overflow-hidden">
              <p className="text-white font-medium truncate">{role === "admin" ? "Administrator" : currentUser?.name}</p>
              <p className="text-slate-500 truncate">{role === "admin" ? "System Access" : "Staff Access"}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-500/10 rounded border border-red-500/20 transition-colors"
          >
            <LogOut size={12} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold uppercase tracking-tight text-slate-900">
              {activeTab.replace('-', ' ').toUpperCase()}
            </h1>
            <div className="h-4 w-[1px] bg-slate-200"></div>
            <button 
              onClick={fetchData}
              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition-colors"
            >
              <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
             {role === "admin" && activeTab === "database" && (
                <div className="flex gap-2">
                  <label className="px-3 py-1.5 text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 rounded font-semibold flex items-center gap-2 cursor-pointer hover:bg-indigo-100 transition-colors">
                    <Upload size={14} />
                    Upload Excel
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (!file) return;
                       const reader = new FileReader();
                       reader.onload = async (evt) => {
                         const bstr = evt.target?.result;
                         const wb = XLSX.read(bstr, { type: "binary" });
                         const ws = wb.Sheets[wb.SheetNames[0]];
                         const data = XLSX.utils.sheet_to_json(ws);
                         const formatted = data.map((item: any) => ({
                           name: item.Name || item.name || item.NAME || "Unknown",
                           mobile: String(item.Mobile || item.mobile || item.MOBILE || ""),
                           remarks: item.Remarks || item.remarks || item.REMARKS || ""
                         }));
                         await fetch("/api/customers/upload", {
                           method: "POST",
                           headers: { "Content-Type": "application/json" },
                           body: JSON.stringify({ customers: formatted })
                         });
                         fetchData();
                       };
                       reader.readAsBinaryString(file);
                    }} />
                   </label>
                </div>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-100">
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                {role === "admin" ? (
                  <AdminView 
                    tab={activeTab} 
                    customers={customers} 
                    employees={employees} 
                    requests={requests}
                    refresh={fetchData} 
                  />
                ) : (
                  <EmployeeView 
                    tab={activeTab} 
                    customers={customers} 
                    currentUser={currentUser} 
                    requests={requests}
                    refresh={fetchData} 
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, count }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, count?: number }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 text-[11px] rounded transition-all duration-200 group",
        active 
          ? "bg-indigo-600 text-white font-semibold" 
          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn("transition-colors", active ? "text-white" : "text-slate-500 group-hover:text-slate-400")}>
          {React.cloneElement(icon as React.ReactElement, { size: 14 })}
        </span>
        {label}
      </div>
      {count !== undefined && count > 0 && (
        <span className={cn(
          "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
          active ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

// --- Supporting Components ---

function Login({ onLogin, fetchEmployees }: { 
  onLogin: (role: UserRole, user?: Employee) => void, 
  fetchEmployees: () => void
}) {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials.username || !credentials.password) return;
    
    setIsLoggingIn(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.role, data.user);
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Connection error. Try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden relative z-10 border border-slate-800/10"
      >
        <div className="p-8 text-center bg-slate-50 border-b border-slate-100">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 text-white shadow-xl shadow-indigo-200 font-bold text-xl">L</div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">LeadFlow Terminal</h2>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-2 italic">Authorized Access Portal</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold rounded text-center uppercase tracking-wider">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Username</label>
            <input 
              type="text"
              required
              disabled={isLoggingIn}
              value={credentials.username}
              onChange={e => setCredentials({...credentials, username: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
              placeholder="Enter username"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Password</label>
            <input 
              type="password"
              required
              disabled={isLoggingIn}
              value={credentials.password}
              onChange={e => setCredentials({...credentials, password: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
              placeholder="Enter password"
            />
          </div>

          <button 
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-indigo-600 text-white rounded-lg py-4 text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-[0.98] shadow-lg shadow-indigo-100 mt-6 disabled:opacity-50"
          >
            {isLoggingIn ? <RefreshCw size={14} className="animate-spin" /> : "Verify Identity"}
          </button>

          <p className="text-[9px] text-center text-slate-400 mt-4 leading-relaxed px-4">
            By accessing this system you agree to our security protocols and data usage policies.
          </p>
        </form>
      </motion.div>
    </div>
  );
}

function AdminView({ tab, customers, employees, requests, refresh }: { 
  tab: string, 
  customers: Customer[], 
  employees: Employee[], 
  requests: LeadRequest[],
  refresh: () => void 
}) {
  if (tab === "database") {
    const unallocated = customers.filter(c => c.status === "unallocated").sort((a, b) => a.createdAt - b.createdAt);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4 shrink-0">
          <StatCard label="Pending Leads" value={unallocated.length} icon={<Database />} color="indigo" />
          <StatCard label="Active Staff" value={employees.filter(e => e.status === "active").length} icon={<Users />} color="emerald" />
          <StatCard label="Conversion" value={`${Math.round((customers.filter(c => c.status === "hot").length / (customers.length || 1)) * 100)}%`} icon={<Flame />} color="red" />
          <StatCard label="Total Records" value={customers.length} icon={<CheckCircle />} color="slate" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Unallocated Database</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">{unallocated.length}</span>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-[10px] text-slate-400 uppercase border-b border-slate-100 font-bold tracking-widest">
                  <th className="px-5 py-3">Customer Name</th>
                  <th className="px-5 py-3">Mobile Number</th>
                  <th className="px-5 py-3">Source Remarks</th>
                </tr>
              </thead>
              <tbody className="text-[11px] divide-y divide-slate-50">
                {unallocated.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-300 italic">Database is empty. Staff can request leads when records are uploaded.</td>
                  </tr>
                ) : (
                  unallocated.map(c => (
                    <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-5 py-2.5 font-semibold text-slate-800">{c.name}</td>
                      <td className="px-5 py-2.5 text-slate-600 font-mono tracking-tighter">{c.mobile}</td>
                      <td className="px-5 py-2.5 text-slate-400 italic truncate max-w-[200px]">{c.remarks || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (tab === "requests") {
    const pending = (requests || []).filter(r => r.status === "pending");
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 mb-4 px-1">Staff Lead Requests</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pending.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-xl border border-slate-200 border-dashed text-slate-400">
              <RefreshCw className="mx-auto mb-3 opacity-20" size={24} />
              <p className="text-xs font-bold uppercase tracking-widest">No pending requests</p>
            </div>
          ) : (
            pending.map(req => (
              <div key={req.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-tighter mb-1">{req.employeeName}</h4>
                  <p className="text-sm font-bold text-slate-900">Requesting 10 leads</p>
                  <p className="text-[10px] text-slate-400 mt-1">{new Date(req.timestamp).toLocaleTimeString()}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      // Rejecting also deletes to clear the queue
                      const res = await fetch(`/api/requests/${req.id}/respond`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "reject" })
                      });
                      if (res.ok) refresh();
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                    title="Reject & Discard Request"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button 
                    onClick={async () => {
                      const handleApprove = async (forcePartial: boolean = false) => {
                        const res = await fetch(`/api/requests/${req.id}/respond`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "accept", force: forcePartial })
                        });
                        
                        const data = await res.json();
                        
                        if (res.ok) {
                          alert(data.message || "Leads sent");
                          refresh();
                        } else {
                          if (data.error === "INSUFFICIENT_LEADS") {
                            const confirmed = modalConfirm(`10 leads are not available. Only ${data.available} leads available. Click Yes if you want to send the available leads?`);
                            if (confirmed) {
                              handleApprove(true);
                            }
                          } else {
                            alert(data.error);
                          }
                        }
                      };
                      handleApprove();
                    }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (tab === "employees") {
    return <EmployeeManagement employees={employees} refresh={refresh} />;
  }

  const filtered = customers.filter(c => c.status === tab);
  const statusConfig: any = {
    good: { icon: <CheckCircle size={14} className="text-emerald-500" />, title: "Good Profiles", color: "emerald" },
    hot: { icon: <Flame size={14} className="text-red-500" />, title: "Hot Leads", color: "red" },
    dump: { icon: <Trash2 size={14} className="text-slate-400" />, title: "Dumped Base", color: "slate" },

  };

  const handleExport = () => {
    const dataToExport = filtered.map(c => ({
      Name: c.name,
      Mobile: c.mobile,
      Agent: c.processedBy || "System",
      Remarks: c.remarks,
      Status: c.status.toUpperCase(),
      Date: new Date(c.createdAt).toLocaleDateString()
    }));
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `${statusConfig[tab]?.title || "leads"}_export.xlsx`);
  };

  const handleClearStatus = async () => {
    if (!modalConfirm(`Are you sure you want to delete ALL records in ${statusConfig[tab]?.title}? This cannot be undone.`)) return;
    
    try {
      const res = await fetch(`/api/customers/clear/${tab}`, { method: "DELETE" });
      if (res.ok) {
        refresh();
      } else {
        alert("Failed to clear records");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred while deleting");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
           <div className="flex items-center gap-2">
            {statusConfig[tab]?.icon}
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{statusConfig[tab]?.title}</h3>
           </div>
           
           <div className="flex gap-2">
              {(tab === "good" || tab === "hot") && (
                <button 
                  onClick={handleExport}
                  disabled={filtered.length === 0}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileSpreadsheet size={14} />
                  Export Excel
                </button>
              )}
              {(tab === "good" || tab === "hot" || tab === "dump") && (
                <button 
                  onClick={handleClearStatus}
                  disabled={filtered.length === 0}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 border border-red-100 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={14} />
                  Delete All
                </button>
              )}
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase font-bold tracking-widest border-b border-slate-100">
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Mobile</th>
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Closing Remarks</th>
              </tr>
            </thead>
            <tbody className="text-[11px] divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-300 italic">No records in this segment.</td></tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-2.5">
                      <div className="font-bold text-slate-800">{c.name}</div>
                    </td>
                    <td className="px-5 py-2.5 text-slate-500 font-mono tracking-tighter">{c.mobile}</td>
                    <td className="px-5 py-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 uppercase tracking-tighter">
                        {c.processedBy || "System"}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-slate-400 italic max-w-xs truncate">{c.remarks}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EmployeeManagement({ employees, refresh }: { employees: Employee[], refresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: "", username: "", password: "", mobile: "" });

  const handleAdd = async () => {
    if (!newEmp.name || !newEmp.username || !newEmp.password || !newEmp.mobile) {
      alert("All fields are required");
      return;
    }
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newEmp, status: "active" })
    });
    if (res.ok) {
      setNewEmp({ name: "", username: "", password: "", mobile: "" });
      setShowAdd(false);
      refresh();
    } else {
      alert("Failed to create employee");
    }
  };

  const handleToggle = async (emp: Employee) => {
    await fetch(`/api/employees/${emp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: emp.status === "active" ? "inactive" : "active" })
    });
    refresh();
  };

  const handleDelete = async (id: string) => {
    if(!modalConfirm("Are you sure you want to remove this employee account?")) return;
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (res.ok) {
        refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete employee");
      }
    } catch (err) {
      console.error(err);
      alert("Connection error while deleting");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-bold mb-3 flex items-center justify-between font-sans">
          Employee Status
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 text-[10px] uppercase font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-2 py-1 rounded border border-indigo-100 shadow-sm"
          >
            <Plus size={10} />
            Add New Employee
          </button>
        </h3>
        <div className="space-y-2">
          {employees.map(emp => (
            <div key={emp.id} className="flex items-center justify-between p-2.5 bg-slate-50/50 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 rounded-lg transition-all group">
              <div className="flex items-center gap-3">
                <div className={cn("w-2 h-2 rounded-full", emp.status === "active" ? "bg-emerald-500" : "bg-slate-300")} />
                <div className="text-xs font-medium">{emp.name}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold px-2 py-1 bg-indigo-50 text-indigo-700 rounded transition-colors group-hover:bg-indigo-100">
                  {emp.allocatedCount} Leads Assigned
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                    onClick={() => handleToggle(emp)}
                    className="p-1 text-slate-400 hover:text-indigo-600"
                    title="Toggle Status"
                  >
                    <RefreshCw size={10} />
                  </button>
                  <button 
                    onClick={() => handleDelete(emp.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                    title="Remove Employee"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl border border-slate-200"
          >
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Onboard New Staff</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Full Name</label>
                <input 
                  type="text" 
                  value={newEmp.name}
                  onChange={e => setNewEmp({ ...newEmp, name: e.target.value })}
                  placeholder="e.g. Rahul Verma"
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Contact (Mobile)</label>
                <input 
                  type="text" 
                  value={newEmp.mobile}
                  onChange={e => setNewEmp({ ...newEmp, mobile: e.target.value })}
                  placeholder="9988776655"
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Login Username</label>
                <input 
                  type="text" 
                  value={newEmp.username}
                  onChange={e => setNewEmp({ ...newEmp, username: e.target.value })}
                  placeholder="staff01"
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Login Password</label>
                <input 
                  type="password" 
                  value={newEmp.password}
                  onChange={e => setNewEmp({ ...newEmp, password: e.target.value })}
                  placeholder="********"
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-3 py-2 text-[10px] text-slate-400 font-bold hover:bg-slate-50 rounded transition-all">Cancel</button>
              <button 
                onClick={handleAdd}
                className="flex-1 bg-indigo-600 text-white font-bold py-2 text-[10px] rounded shadow-sm hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-widest"
              >
                Create Account
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function EmployeeView({ tab, customers, currentUser, requests, refresh }: { 
  tab: string, 
  customers: Customer[], 
  currentUser: Employee | null,
  requests: LeadRequest[],
  refresh: () => void 
}) {
  const [editingLead, setEditingLead] = useState<Customer | null>(null);
  const [remark, setRemark] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);

  const myRequests = (requests || []).filter(r => r.employeeId === currentUser?.id).sort((a, b) => b.timestamp - a.timestamp);
  const hasPendingRequest = myRequests.some(r => r.status === "pending");
  // Get the most recent accepted request message
  const latestAccepted = myRequests.find(r => r.status === "accepted");
  const latestMessage = latestAccepted?.assignmentMessage;

  const handleSubmitStatus = async (status: Customer["status"]) => {
    if (!editingLead) return;
    await fetch("/api/customers/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: editingLead.id,
        status,
        remarks: remark,
        employeeName: currentUser?.name
      })
    });
    setEditingLead(null);
    setRemark("");
    refresh();
  };

  const allocated = customers.filter(c => c.status === "allocated" && c.employeeId === currentUser?.id);
  const myGood = customers.filter(c => c.status === "good" && c.processedBy === currentUser?.name);
  const myHot = customers.filter(c => c.status === "hot" && c.processedBy === currentUser?.name);

  if (tab === "allocated") {
    return (
      <div className="space-y-4">
        {latestMessage && (
          <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex items-center gap-3 animate-pulse">
            <Info size={14} className="text-indigo-600" />
            <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">{latestMessage}</p>
          </div>
        )}
        <div className="flex justify-end px-1">
          <button 
            disabled={hasPendingRequest || isRequesting}
            onClick={async () => {
              if (!currentUser) return;
              
              setIsRequesting(true);
              try {
                const res = await fetch("/api/requests", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ employeeId: currentUser.id, employeeName: currentUser.name })
                });
                
                if (res.ok) {
                  alert("Lead request sent to admin.");
                  refresh();
                } else {
                  const err = await res.json();
                  alert(err.error || "Failed to make request");
                }
              } catch (error) {
                console.error("Request failed:", error);
                alert("Network error. Please try again.");
              } finally {
                setIsRequesting(false);
              }
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-sm",
              hasPendingRequest || isRequesting
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            )}
          >
            {isRequesting ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            {hasPendingRequest ? "Request Pending" : "Ask 10 Leads"}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allocated.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-xl border border-slate-200 border-dashed">
              <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                <Database size={20} />
              </div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Allocated Records</h3>
            </div>
          ) : (
            allocated.map(c => (
              <motion.div 
                layoutId={c.id}
                key={c.id} 
                onClick={() => { setEditingLead(c); setRemark(c.remarks || ""); }}
                className="bg-white hover:bg-indigo-50/30 p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer transition-all flex items-center justify-between group"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 tracking-tight">{c.name}</h4>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono mt-1">
                    <Phone size={10} className="text-indigo-400" />
                    {c.mobile}
                  </div>
                </div>
                <div className="bg-slate-50 p-1.5 rounded text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <ChevronRight size={14} />
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Edit Modal */}
        <AnimatePresence>
          {editingLead && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-6 z-50">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200"
              >
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Processing Lead</h3>
                    <p className="text-sm font-bold text-slate-900">{editingLead.name}</p>
                  </div>
                  <button onClick={() => setEditingLead(null)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
                </div>

                <div className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Engagement Notes</label>
                    <textarea 
                      value={remark}
                      onChange={e => setRemark(e.target.value)}
                      placeholder="Enter call outcome..."
                      className="w-full h-24 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <StatusBtn 
                      onClick={() => handleSubmitStatus("good")}
                      label="Good Profile" 
                      color="bg-emerald-600"
                      icon={<CheckCircle size={14} />}
                    />
                    <StatusBtn 
                      onClick={() => handleSubmitStatus("hot")}
                      label="Hot Lead" 
                      color="bg-red-600"
                      icon={<Flame size={14} />}
                    />
                    <StatusBtn 
                      onClick={() => handleSubmitStatus("dump")}
                      label="Dump" 
                      color="bg-slate-600"
                      icon={<Trash2 size={14} />}
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const list = tab === "my-good" ? myGood : myHot;
  const colorClass = tab === "my-good" ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400 italic text-xs">No records found for this category.</div>
        ) : (
          list.map(c => (
            <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm group">
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-xs font-bold text-slate-900 tracking-tight">{c.name}</h4>
                <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest", colorClass)}>
                  {c.status}
                </span>
              </div>
              <div className="bg-slate-50 rounded-lg p-2 text-[10px] text-slate-500 border border-slate-100 group-hover:border-indigo-100 transition-colors">
                <p className="italic leading-relaxed">"{c.remarks || "No entry recorded"}"</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function StatusBtn({ label, color, icon, onClick }: { label: string, color: string, icon: React.ReactNode, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg text-white font-bold text-[8px] uppercase tracking-widest transition-all shadow-sm hover:brightness-110 active:scale-95",
        color
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: any, icon: React.ReactNode, color: string }) {
  const colors: any = {
    indigo: "text-indigo-600",
    emerald: "text-emerald-600",
    red: "text-red-600",
    slate: "text-slate-600"
  };
  return (
    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-2">
        {React.cloneElement(icon as React.ReactElement, { size: 10 })}
        {label}
      </p>
      <p className={cn("text-2xl font-bold tracking-tighter", colors[color])}>{value}</p>
    </div>
  );
}

// Icons placeholders for Lucide fallback
function Lock(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

