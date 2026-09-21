import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Customer {
  id: string;
  name: string;
  mobile: string;
  remarks: string;
  status: "unallocated" | "allocated" | "good" | "hot" | "dump";
  employeeId?: string;
  processedBy?: string; // name of employee
  createdAt: number;
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

interface LeadRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  timestamp: number;
  status: "pending" | "accepted" | "rejected";
  assignmentMessage?: string;
}

// In-memory data store
let customers: Customer[] = [];
let employees: Employee[] = [];
let leadRequests: LeadRequest[] = [];

const ADMIN_CREDENTIALS = {
  username: "admin01",
  password: "2026admin@Loanitol"
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Routes
  
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    console.log(`[LOGIN] Attempt for username: ${username}`);

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      console.log(`[LOGIN] Admin login successful`);
      return res.json({ role: "admin" });
    }

    const employee = employees.find(e => e.username === username && e.password === password);
    if (employee) {
      if (employee.status !== "active") {
        console.log(`[LOGIN] Employee ${username} is inactive`);
        return res.status(403).json({ error: "Your account is inactive. Please contact admin." });
      }
      console.log(`[LOGIN] Employee login successful for: ${employee.name}`);
      return res.json({ role: "employee", user: employee });
    }

    console.log(`[LOGIN] Invalid credentials for: ${username}`);
    res.status(401).json({ error: "Invalid username or password" });
  });
  // Customers
  app.get("/api/customers", (req, res) => {
    res.json(customers);
  });

  app.post("/api/customers/upload", (req, res) => {
    const newCustomers: Customer[] = req.body.customers.map((c: any) => ({
      ...c,
      id: Math.random().toString(36).substr(2, 9),
      status: "unallocated",
      remarks: c.remarks || "",
      createdAt: Date.now()
    }));
    // Append at the end (FIFO)
    customers = [...customers, ...newCustomers];
    res.json({ success: true, count: newCustomers.length });
  });

  // Lead Requests
  app.get("/api/requests", (req, res) => {
    res.json(leadRequests);
  });

  app.post("/api/requests", (req, res) => {
    const { employeeId, employeeName } = req.body;
    console.log(`[LEAD REQUEST] Incoming request from ${employeeName} (ID: ${employeeId})`);
    
    if (!employeeId || !employeeName) {
      console.error("[LEAD REQUEST] Missing employee details in request body");
      return res.status(400).json({ error: "Missing employee details" });
    }
    
    // Simple deduplication: one pending request per employee
    const existing = leadRequests.find(r => r.employeeId === employeeId && r.status === "pending");
    if (existing) {
      console.warn(`[LEAD REQUEST] Request already pending for ${employeeName}`);
      return res.status(400).json({ error: "Request already pending" });
    }

    const newRequest: LeadRequest = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId,
      employeeName,
      timestamp: Date.now(),
      status: "pending"
    };
    leadRequests.push(newRequest);
    res.json(newRequest);
  });

  app.post("/api/requests/:id/respond", (req, res) => {
    const { id } = req.params;
    const { action, force } = req.body; 
    
    const requestIndex = leadRequests.findIndex(r => r.id === id);
    if (requestIndex === -1) return res.status(404).json({ error: "Request not found" });

    const request = leadRequests[requestIndex];

    if (action === "reject") {
      request.status = "rejected";
      console.log(`[LEAD REQUEST] Request ${id} rejected by admin`);
      return res.json({ success: true });
    }

    if (action === "accept") {
      const emp = employees.find(e => e.id === request.employeeId);
      
      if (!emp) {
        request.status = "rejected";
        return res.status(400).json({ error: "Employee account no longer exists." });
      }

      const unallocated = customers
        .filter(c => c.status === "unallocated")
        .sort((a, b) => a.createdAt - b.createdAt);
      
      if (unallocated.length === 0) {
        return res.status(400).json({ error: "No leads available in the database." });
      }

      if (unallocated.length < 10 && !force) {
        return res.status(400).json({ 
          error: "INSUFFICIENT_LEADS", 
          available: unallocated.length 
        });
      }

      const countToAssign = Math.min(10, unallocated.length);
      const toAssign = unallocated.slice(0, countToAssign);

      toAssign.forEach(c => {
        c.status = "allocated";
        c.employeeId = emp.id;
        c.processedBy = emp.name;
      });

      emp.allocatedCount += toAssign.length;
      request.status = "accepted";
      
      const finalMsg = toAssign.length < 10 
        ? `Only ${toAssign.length} leads were sent due to limited data.` 
        : "Success: 10 leads assigned to your account.";
      
      request.assignmentMessage = finalMsg;
      
      console.log(`[LEAD REQUEST] Request ${id} accepted. Assigned ${toAssign.length} leads to ${emp.name}`);
      
      res.json({ 
        success: true, 
        assigned: toAssign.length,
        message: toAssign.length < 10 ? "Partial Leads Sent" : "Leads sent"
      });
    }
  });

  app.delete("/api/requests/:id", (req, res) => {
    const { id } = req.params;
    leadRequests = leadRequests.filter(r => r.id !== id);
    res.json({ success: true });
  });

  app.post("/api/customers/update-status", (req, res) => {
    const { customerId, status, remarks, employeeName } = req.body;
    const index = customers.findIndex(c => c.id === customerId);
    
    if (index !== -1) {
      customers[index].status = status;
      customers[index].remarks = remarks;
      customers[index].processedBy = employeeName;
      
      // If it was allocated, decrement the employee's count
      const emp = employees.find(e => e.id === customers[index].employeeId);
      if (emp) {
        emp.allocatedCount = Math.max(0, emp.allocatedCount - 1);
      }
      
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Customer not found" });
    }
  });

  app.delete("/api/customers/clear/:status", (req, res) => {
    const { status } = req.params;
    customers = customers.filter(c => c.status !== status);
    res.json({ success: true });
  });

  // Employees
  app.get("/api/employees", (req, res) => {
    res.json(employees);
  });

  app.post("/api/employees", (req, res) => {
    console.log(`[EMPLOYEE] Creating new employee: ${req.body.name} (${req.body.username})`);
    const newEmp: Employee = {
      ...req.body,
      id: Math.random().toString(36).substr(2, 9),
      allocatedCount: 0
    };
    employees.push(newEmp);
    res.json(newEmp);
  });

  app.delete("/api/employees/:id", (req, res) => {
    const { id } = req.params;
    const emp = employees.find(e => e.id === id);
    if (!emp) {
      console.warn(`[EMPLOYEE] Attempted to delete non-existent employee ID: ${id}`);
      return res.status(404).json({ error: "Employee not found" });
    }
    
    console.log(`[EMPLOYEE] Deleting employee: ${emp.name} (ID: ${id})`);
    employees = employees.filter(e => e.id !== id);
    // Also clean up any pending requests for this employee
    leadRequests = leadRequests.filter(r => r.employeeId !== id);
    
    res.json({ success: true });
  });

  app.patch("/api/employees/:id", (req, res) => {
    const index = employees.findIndex(e => e.id === req.params.id);
    if (index !== -1) {
      employees[index] = { ...employees[index], ...req.body };
      res.json(employees[index]);
    } else {
      res.status(404).json({ error: "Employee not found" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
