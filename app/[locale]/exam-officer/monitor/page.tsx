"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  UserCheck,
  Ticket,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  AlertTriangle,
  LayoutDashboard,
  Activity,
  Monitor,
  UserPlus,
  CheckCircle,
  ChevronRight,
  Send,
  Square,
  CheckSquare,
  MinusSquare,
  Zap,
  MessageSquare,
  X
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { monitorApi, SubjectMonitorSummary, SessionRoomDetail } from "@/lib/api/monitor";
import { useSocket } from "@/hooks/use-socket";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MonitorDashboardPage() {
  const t = useTranslations("MonitorDashboard");
  const commonT = useTranslations("Common");
  const { user } = useAuthStore();

  const [data, setData] = useState<SubjectMonitorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<SubjectMonitorSummary | null>(null);
  
  // Selection & Broadcast States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [sessionPhase, setSessionPhase] = useState<"ALL" | "ONGOING" | "UPCOMING" | "COMPLETED">("ONGOING");

  const { on } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      const summary = await monitorApi.getSummary({});
      setData(summary);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch monitor summary:", error);
      toast.error("Failed to load monitor data");
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  // Real-time ticket updates
  useEffect(() => {
    const handleTicketCreated = () => {
      fetchData(); // Simplest way to update counts
    };

    const cleanup = on?.("ticket:created", handleTicketCreated);
    return () => {
      if (cleanup) cleanup();
    };
  }, [on, fetchData]);


  const globalStats = useMemo(() => {
    return data.reduce((acc, sub) => ({
      proctors: acc.proctors + sub.presentProctors,
      totalProctors: acc.totalProctors + sub.totalProctors,
      hall: acc.hall + sub.presentHallInvigilators,
      totalHall: acc.totalHall + sub.totalHallInvigilators,
      students: acc.students + sub.checkedInStudents,
      totalStudents: acc.totalStudents + sub.totalStudents,
      tickets: acc.tickets + sub.pendingTickets,
    }), { proctors: 0, totalProctors: 0, hall: 0, totalHall: 0, students: 0, totalStudents: 0, tickets: 0 });
  }, [data]);

  const filteredData = useMemo(() => {
    let result = data;
    const now = new Date();

    // 1. Filter by phase
    if (sessionPhase !== "ALL") {
      result = result.filter(subject => {
        const openTime = new Date(subject.examOpenTime);
        const closeTime = new Date(subject.examCloseTime);
        const isCompleted = subject.status === "Completed" || now > closeTime;
        const isOngoing = (subject.status === "Ongoing" || (now >= openTime && now <= closeTime) || (subject.status === "Scheduled" && now >= new Date(openTime.getTime() - 60 * 60 * 1000))); // also consider checkin phase as ongoing

        if (sessionPhase === "COMPLETED") return isCompleted;
        if (sessionPhase === "ONGOING") return !isCompleted && isOngoing;
        if (sessionPhase === "UPCOMING") return !isCompleted && !isOngoing;
        return true;
      });
    }

    // 2. Filter by search term
    if (searchTerm) {
      result = result.filter(s =>
        s.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.sessions.some(session => session.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (activeFilter === "missingProctor") {
      result = result.filter(s => s.presentProctors < s.totalProctors);
    } else if (activeFilter === "hasTickets") {
      result = result.filter(s => s.pendingTickets > 0);
    } else if (activeFilter === "lowAttendance") {
      result = result.filter(s => (s.checkedInStudents / s.totalStudents) < 0.5);
    }

    return result;
  }, [data, searchTerm, activeFilter]);

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 bg-[#F1F5F9] min-h-screen">
      {/* Sticky HUD Section */}
      <div className="sticky top-0 z-40 -mx-4 px-4 pt-2 pb-0 bg-[#F1F5F9]/95 backdrop-blur-sm space-y-2">
        {/* Super Compact Header & Stats Combined */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-3 rounded-t-2xl shadow-md border border-slate-200 border-b-0">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-100">
               <Monitor className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none">{t("title")}</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Campus {user?.campus || "N/A"}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
             <MinimalStat icon={<UserCheck className="w-4 h-4 text-indigo-500" />} label={t("stats.totalProctors")} current={globalStats.proctors} total={globalStats.totalProctors} />
             <MinimalStat icon={<Users className="w-4 h-4 text-blue-500" />} label={t("stats.totalHall")} current={globalStats.hall} total={globalStats.totalHall} />
             <MinimalStat icon={<Activity className="w-4 h-4 text-emerald-500" />} label={t("stats.totalStudents")} current={globalStats.students} total={globalStats.totalStudents} />
             <MinimalStat 
                icon={<Ticket className="w-4 h-4" />} 
                label={t("stats.pendingTickets")} 
                current={globalStats.tickets} 
                total={0} 
                isAlert={globalStats.tickets > 0} 
                onClick={() => setActiveFilter(activeFilter === "hasTickets" ? null : "hasTickets")}
             />
          </div>

          <div className="flex items-center gap-2">
              <div className="relative group">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                 <Input 
                    placeholder="Search..."
                    className="pl-9 h-9 w-40 bg-slate-50 border-slate-200 text-xs font-bold rounded-lg focus:ring-orange-500/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
              <Button variant="outline" size="sm" className="h-9 border-slate-200 font-bold text-xs gap-2 shadow-sm" onClick={() => fetchData()}>
                <Clock className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                {commonT("refresh")}
              </Button>
          </div>
        </div>

        {/* Compact Filters & Counter */}
        <div className="flex items-center justify-between px-2 py-1">
            <div className="flex gap-2">
               <FilterTab active={sessionPhase === "ONGOING"} onClick={() => setSessionPhase("ONGOING")} label={t("phases.ongoing")} />
               <FilterTab active={sessionPhase === "UPCOMING"} onClick={() => setSessionPhase("UPCOMING")} label={t("phases.upcoming")} />
               <FilterTab active={sessionPhase === "COMPLETED"} onClick={() => setSessionPhase("COMPLETED")} label={t("phases.completed")} />
               <FilterTab active={sessionPhase === "ALL"} onClick={() => setSessionPhase("ALL")} label={t("phases.all")} />
            </div>
            
            <div className="flex items-center">
              <div className="text-[11px] font-black text-slate-500 bg-slate-100/50 px-4 py-1.5 rounded-full border border-slate-200 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  {filteredData.length} Subjects Active
              </div>

              <div className="flex gap-2 ml-4">
                  <Button 
                    variant={isSelectionMode ? "primary" : "outline"} 
                    size="sm" 
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      setSelectedSubjectIds(new Set());
                    }}
                    className={cn(
                      "h-9 rounded-xl font-bold text-[10px] uppercase tracking-wider gap-2 px-4 transition-all active:scale-95 shadow-sm",
                      isSelectionMode ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "bg-white border-slate-100 text-slate-400"
                    )}
                  >
                    {isSelectionMode ? <X className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    {isSelectionMode ? "Exit Broadcast Mode" : "Broadcast Mode"}
                  </Button>
                  
                  {isSelectionMode && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const allIds = new Set(filteredData.map(s => s.subjectCode));
                        setSelectedSubjectIds(selectedSubjectIds.size === filteredData.length ? new Set() : allIds);
                      }}
                      className="h-9 rounded-xl font-bold text-[10px] uppercase tracking-wider bg-white border-slate-100 text-slate-400 px-4 transition-all shadow-sm"
                    >
                      {selectedSubjectIds.size === filteredData.length ? "Deselect All" : "Select All"}
                    </Button>
                  )}
              </div>
            </div>
        </div>
      </div>

      <div className="pb-8">
          {filteredData.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 font-medium bg-white/50 border-dashed">
                {commonT("noResults")}
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredData.map(subject => {
                const isSelected = selectedSubjectIds.has(subject.subjectCode);
                return (
                  <div 
                    key={subject.subjectCode} 
                    onClick={() => {
                      if (isSelectionMode) {
                        const next = new Set(selectedSubjectIds);
                        if (next.has(subject.subjectCode)) next.delete(subject.subjectCode);
                        else next.add(subject.subjectCode);
                        setSelectedSubjectIds(next);
                      } else {
                        setSelectedSubject(subject);
                      }
                    }} 
                    className={cn(
                      "cursor-pointer transition-all duration-300 relative",
                      isSelectionMode && isSelected ? "scale-95" : isSelectionMode ? "scale-[0.98] opacity-80" : ""
                    )}
                  >
                    {isSelectionMode && (
                      <div className={cn(
                        "absolute -top-1.5 -right-1.5 z-20 w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center transition-all duration-500",
                        isSelected ? "bg-orange-500 text-white scale-110 rotate-0" : "bg-slate-200 text-slate-400 scale-90 -rotate-12"
                      )}>
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <MinusSquare className="w-4 h-4" />}
                      </div>
                    )}
                    <SubjectCard
                      subject={subject}
                      t={t}
                      isSelected={isSelectionMode && isSelected}
                    />
                  </div>
                );
              })}
            </div>
          )}
      </div>

      {/* Modern Room Details Popup */}
      <Dialog open={!!selectedSubject} onOpenChange={(open) => !open && setSelectedSubject(null)}>
        <DialogContent className="max-w-6xl w-[95vw] h-[85vh] p-0 overflow-hidden border-none rounded-[40px] shadow-2xl bg-slate-50/95 backdrop-blur-2xl">
          {selectedSubject && (
            <div className="flex flex-col h-full">
               {/* Custom Modal Header */}
               <div className="p-8 bg-white/80 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex flex-col">
                     <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-orange-100 text-orange-600">
                           <LayoutDashboard className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">
                           {selectedSubject.subjectCode}
                        </h2>
                        <StatusBadge subject={selectedSubject} t={t} />
                     </div>
                     <p className="text-sm font-bold text-slate-400 mt-2 ml-14 uppercase tracking-widest">
                        Room Details & Management Control
                     </p>
                  </div>
                  
                  <div className="flex gap-4 px-6 py-3 rounded-3xl bg-slate-50 border border-slate-100 shadow-inner">
                     <CompactStat label="Proctors" current={selectedSubject.presentProctors} total={selectedSubject.totalProctors} color="text-indigo-600" />
                     <div className="w-px h-10 bg-slate-200" />
                     <CompactStat label="Hall" current={selectedSubject.presentHallInvigilators} total={selectedSubject.totalHallInvigilators} color="text-blue-600" />
                     <div className="w-px h-10 bg-slate-200" />
                     <CompactStat label="Students" current={selectedSubject.checkedInStudents} total={selectedSubject.totalStudents} color="text-emerald-600" />
                  </div>
               </div>

               {/* Scrollable Room Grid */}
               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {selectedSubject.sessions.map((room) => (
                      <div key={room.sessionId} className="transform transition-all duration-300 hover:scale-[1.03]">
                        <RoomCard session={room} t={t} />
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Action Bar for Selection Mode */}
      {isSelectionMode && selectedSubjectIds.size > 0 && (
         <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-10 duration-500">
            <div className="bg-slate-900 text-white px-6 py-3 rounded-[24px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] flex items-center gap-8 border border-white/10 backdrop-blur-xl">
               <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Targets</span>
                  <div className="flex items-center gap-2">
                     <span className="text-xl font-black tabular-nums">{selectedSubjectIds.size}</span>
                     <span className="text-xs font-bold text-slate-400 uppercase">Subjects</span>
                  </div>
               </div>
               
               <div className="h-8 w-px bg-white/10" />
               
               <div className="flex gap-4">
                  <Button 
                    onClick={() => setSelectedSubjectIds(new Set())}
                    variant="ghost" 
                    className="h-10 px-4 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-[9px]"
                  >
                    Clear
                  </Button>
                  <Button 
                    onClick={() => setIsBroadcastModalOpen(true)}
                    className="h-10 px-6 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest text-[10px] gap-2 shadow-xl shadow-orange-900/20 active:scale-95 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Broadcast
                  </Button>
               </div>
            </div>
         </div>
      )}

      {/* Broadcast Center Modal */}
      <BroadcastModal 
         isOpen={isBroadcastModalOpen} 
         onClose={() => setIsBroadcastModalOpen(false)}
         targetCount={selectedSubjectIds.size}
         t={t}
      />
    </div>
  );
}

interface AnnouncementTemplate {
  id: string;
  title: string;
  content: string;
  type: string;
}

function BroadcastModal({ isOpen, onClose, targetCount, t }: { isOpen: boolean, onClose: () => void, targetCount: number, t: any }) {
  const [templates, setTemplates] = useState<AnnouncementTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<AnnouncementTemplate | null>(null);
  const [customMsg, setCustomMsg] = useState("");
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  // Parse variables from template content e.g. {time}, {reason}
  const extractParams = (content: string) => {
    const regex = /\{([^}]+)\}/g;
    const matches = content.match(regex);
    if (!matches) return [];
    return Array.from(new Set(matches.map(m => m.slice(1, -1))));
  };

  const currentParams = selectedTemplate ? extractParams(selectedTemplate.content) : [];

  // Re-generate message when params or template change
  useEffect(() => {
    if (selectedTemplate) {
      let finalContent = selectedTemplate.content;
      Object.entries(templateParams).forEach(([key, val]) => {
        finalContent = finalContent.replace(new RegExp(`\\{${key}\\}`, 'g'), val || `{${key}}`);
      });
      setCustomMsg(finalContent);
    }
  }, [selectedTemplate, templateParams]);

  const handleSelectTemplate = (temp: AnnouncementTemplate) => {
    setSelectedTemplate(temp);
    setTemplateParams({}); // Reset params
    setCustomMsg(temp.content);
  };

  useEffect(() => {
    if (isOpen) {
      import("@/lib/api/templates").then(m => m.templatesApi.getTemplates()).then(data => {
        setTemplates(data);
        setLoading(false);
      });
    }
  }, [isOpen]);

  const handleSend = () => {
    setSending(true);
    setTimeout(() => {
       toast.success(`Announcement sent to ${targetCount} subjects successfully!`);
       setSending(false);
       onClose();
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl p-0 border-none rounded-3xl shadow-2xl overflow-hidden bg-white">
        <div className="flex h-[80vh]">
           {/* Sidebar: Library */}
           <div className="w-[300px] bg-slate-50 border-r border-slate-100 flex flex-col">
              <div className="p-6 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                     <MessageSquare className="w-4 h-4 text-orange-600" />
                     Message Library
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Select a template to start</p>
              </div>
              
              <ScrollArea className="flex-1 p-4">
                 <div className="space-y-3">
                    {templates.map(temp => (
                       <button
                          key={temp.id}
                          onClick={() => handleSelectTemplate(temp)}
                          className={cn(
                             "w-full text-left p-4 rounded-xl transition-all border-2",
                             selectedTemplate?.id === temp.id 
                              ? "border-orange-500 bg-orange-50/50 shadow-sm" 
                              : "border-transparent bg-white hover:border-slate-200"
                          )}
                       >
                          <div className="flex items-center justify-between mb-1.5">
                             <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                                {temp.type}
                             </span>
                          </div>
                          <p className="text-sm font-bold text-slate-900 leading-tight mb-1">{temp.title}</p>
                          <p className="text-xs text-slate-500 line-clamp-1">{temp.content}</p>
                       </button>
                    ))}
                 </div>
              </ScrollArea>
           </div>

           {/* Content Area */}
           <div className="flex-1 flex flex-col bg-white">
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                 <div>
                    <h2 className="text-xl font-bold text-slate-900">Broadcast Announcement</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Your message will be sent to {targetCount} active subjects.</p>
                 </div>
                 <div className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold border border-orange-100 flex items-center gap-2 shadow-sm">
                    <Zap className="w-3.5 h-3.5 fill-orange-500" />
                    {targetCount} Subjects Target
                 </div>
              </div>

              <div className="flex-1 flex flex-col p-8 gap-6 overflow-hidden">
                 {/* Dynamic Params */}
                 {selectedTemplate && currentParams.length > 0 && (
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                       <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4">Required Parameters</h4>
                       <div className="grid grid-cols-2 gap-4">
                          {currentParams.map(param => (
                             <div key={param} className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-700 ml-1">{param}</label>
                                <input
                                  type="text"
                                  placeholder={`e.g. 10:00 AM`}
                                  className="w-full h-10 px-4 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all shadow-sm"
                                  value={templateParams[param] || ""}
                                  onChange={(e) => setTemplateParams(prev => ({ ...prev, [param]: e.target.value }))}
                                />
                             </div>
                          ))}
                       </div>
                    </div>
                 )}

                 {/* Message Editor */}
                 <div className="flex-1 flex flex-col">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Live Content Preview</label>
                    <textarea
                      className="w-full flex-1 bg-white border border-slate-200 rounded-xl p-6 text-sm sm:text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none shadow-inner leading-relaxed"
                      placeholder="Type your announcement here..."
                      value={customMsg}
                      onChange={(e) => setCustomMsg(e.target.value)}
                    />
                    <div className="mt-2 flex justify-between items-center px-2">
                       <span className="text-[11px] text-slate-400 font-medium">{customMsg.length} characters</span>
                       <span className="text-[11px] text-orange-600 font-bold flex items-center gap-1">
                          <Activity className="w-3 h-3 animate-pulse" /> Live Preview Enabled
                       </span>
                    </div>
                 </div>
              </div>

              {/* Action Footer */}
              <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                 <Button 
                    variant="outline" 
                    onClick={onClose}
                    className="flex-1 h-11 rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-slate-100"
                 >
                    Cancel
                 </Button>
                 <Button 
                    onClick={handleSend}
                    disabled={sending || customMsg.trim() === ""}
                    className="flex-[2] h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2 shadow-lg shadow-orange-200 disabled:opacity-50 active:scale-95 transition-all"
                 >
                    {sending ? (
                       <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Sending...</>
                    ) : (
                       <><Send className="w-4 h-4" /> Send Announcement</>
                    )}
                 </Button>
              </div>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


function CompactStat({ label, current, total, color }: { label: string, current: number, total: number, color: string }) {
   return (
      <div className="flex flex-col items-center px-4">
         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</span>
         <span className={cn("text-lg font-black tabular-nums", color)}>{current}/{total}</span>
      </div>
   );
}

// --- MINIMAL HUD COMPONENTS ---

function MinimalStat({ icon, label, current, total, isAlert, onClick }: any) {
  return (
     <div 
        onClick={onClick}
        className={cn(
           "flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all",
           onClick && "cursor-pointer hover:bg-slate-50 active:scale-95",
           isAlert ? "bg-red-50 text-red-600 border border-red-100" : "bg-white"
        )}
     >
        <div className={cn("shrink-0", isAlert && "animate-bounce")}>{icon}</div>
        <div className="flex flex-col">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none">{label}</span>
           <div className="flex items-baseline gap-1 mt-1">
              <span className={cn("text-base font-black tabular-nums leading-none", isAlert ? "text-red-600" : "text-slate-900")}>{current}</span>
              {total > 0 && <span className="text-[10px] font-bold text-slate-400">/ {total}</span>}
           </div>
        </div>
     </div>
  );
}

function FilterBtn({ active, onClick, label }: any) {
   return (
      <button 
         onClick={onClick}
         className={cn(
            "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
            active ? "bg-slate-900 text-white shadow-md shadow-slate-200" : "text-slate-500 hover:bg-white"
         )}
      >
         {label}
      </button>
   );
}

function StatCard({ icon, label, current, total, color, onClick, active, alert, showTotal = true }: any) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  
  const colors: any = {
    blue: "from-blue-500 to-cyan-500 text-blue-600 bg-blue-50 border-blue-100 shadow-blue-100",
    indigo: "from-indigo-600 to-blue-600 text-indigo-600 bg-indigo-50 border-indigo-100 shadow-indigo-100",
    emerald: "from-emerald-600 to-teal-500 text-emerald-600 bg-emerald-50 border-emerald-100 shadow-emerald-100",
    orange: "from-orange-600 to-amber-500 text-orange-600 bg-orange-50 border-orange-100 shadow-orange-100",
  };

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "cursor-pointer group relative overflow-hidden transition-all duration-300 rounded-[2rem] border-2",
        active ? "border-slate-900 bg-white shadow-2xl -translate-y-1" : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg",
        alert && !active && "animate-pulse border-red-200 ring-4 ring-red-50"
      )}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br transition-transform group-hover:scale-110",
            colors[color]
          )}>
            <div className="text-white drop-shadow-sm">
              {icon}
            </div>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Utilization</span>
             <span className={cn("text-xs font-black", percentage >= 90 ? "text-emerald-500" : percentage >= 50 ? "text-indigo-500" : "text-orange-500")}>
                {Math.round(percentage)}%
             </span>
          </div>
        </div>
        
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 leading-none">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">{current}</p>
            {showTotal && (
              <p className="text-slate-400 font-bold tracking-tight">/ {total}</p>
            )}
          </div>
        </div>
        
        {/* Glow effect */}
        <div className={cn(
          "absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-[0.03] blur-3xl transition-opacity group-hover:opacity-[0.08]",
          color === 'blue' ? 'bg-blue-600' : 
          color === 'indigo' ? 'bg-indigo-600' : 
          color === 'emerald' ? 'bg-emerald-600' : 'bg-orange-600'
        )} />
      </CardContent>
    </Card>
  );
}

function FilterTab({ active, onClick, label }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px- w-full sm:w-28 py-2.5 rounded-xl text-[11px] font-black transition-all duration-200 uppercase tracking-widest",
        active 
          ? "bg-white text-slate-900 shadow-md ring-1 ring-slate-200" 
          : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
      )}
    >
      {label}
    </button>
  );
}

function SubjectCard({ subject, t, isSelected }: { subject: SubjectMonitorSummary, t: any, isSelected?: boolean }) {
  const hasTickets = subject.pendingTickets > 0;
  
  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-500 rounded-[30px] group shrink-0",
        isSelected 
          ? "ring-4 ring-slate-900 bg-white shadow-[0_30px_70px_rgba(0,0,0,0.15)] border-transparent" 
          : "border-slate-200/50 bg-white backdrop-blur-md shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_25px_60px_rgba(249,115,22,0.15)] hover:-translate-y-1.5",
        hasTickets && !isSelected ? "ring-2 ring-orange-500 bg-orange-50/20 shadow-orange-100" : ""
      )}
    >
      <div className={cn("absolute top-0 left-0 right-0 h-1", isSelected ? "bg-slate-900" : hasTickets ? "bg-orange-500" : "bg-slate-100")} />

      <div className="p-4 flex flex-col h-full gap-4">
        {/* Header: Distinct */}
        <div className="flex justify-between items-start">
           <div className="flex flex-col">
             <div className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none group-hover:text-orange-600 transition-colors">{subject.subjectCode}</div>
             <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{new Date(subject.examOpenTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
           </div>
           <StatusBadge subject={subject} t={t} isSmall />
        </div>

        {/* High Impact Stats Row */}
        <div className="flex items-center justify-between px-1">
           <CircularMetric label={t("table.proctorRate")} current={subject.presentProctors} total={subject.totalProctors} color="indigo" />
           <CircularMetric label={t("table.hallRate")} current={subject.presentHallInvigilators} total={subject.totalHallInvigilators} color="blue" />
           <CircularMetric label={t("table.studentRate")} current={subject.checkedInStudents} total={subject.totalStudents} color="emerald" />
        </div>

        {/* Footer info: Compact */}
        <div className={cn(
           "flex items-center justify-between p-2 rounded-2xl transition-all",
           hasTickets ? "bg-orange-600 text-white shadow-lg animate-pulse" : "bg-slate-50 border border-slate-100"
        )}>
           <CountdownTimer endTime={subject.examCloseTime} startTime={subject.examOpenTime} status={subject.status} size="small" inverse={hasTickets} />
           {hasTickets ? (
             <div className="flex items-center gap-1 font-black text-xs uppercase">
               <Ticket className="w-4 h-4" />
               {subject.pendingTickets}
             </div>
           ) : (
             <div className="text-[9px] font-black text-slate-400 uppercase group-hover:text-orange-600 transition-colors">
               Detail <ChevronRight className="inline w-3 h-3" />
             </div>
           )}
        </div>
      </div>
    </Card>
  );
}

function CircularMetric({ label, current, total, color }: { label: string, current: number, total: number, color: string }) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  const ringConfigs: Record<string, { main: string, bg: string, text: string, label: string }> = {
    indigo: { main: "stroke-indigo-500", bg: "stroke-indigo-50", text: "text-indigo-600", label: "Proctor" },
    blue: { main: "stroke-blue-500", bg: "stroke-blue-50", text: "text-blue-600", label: "Hall" },
    emerald: { main: "stroke-emerald-500", bg: "stroke-emerald-50", text: "text-emerald-600", label: "Stud" },
  };

  const config = ringConfigs[color];

  return (
    <div className="flex flex-col items-center gap-2 group/metric">
      <div className="relative w-14 h-14">
        <svg className="w-full h-full -rotate-90">
          <circle cx="28" cy="28" r={radius} strokeWidth="4.5" fill="transparent" className={cn("transition-colors duration-300", config.bg)} />
          <circle cx="28" cy="28" r={radius} strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" fill="transparent" className={cn("transition-all duration-1000 drop-shadow-sm", config.main)} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
           <span className={cn("text-xs font-black tabular-nums leading-none tracking-tighter", config.text)}>{Math.round(percentage)}%</span>
        </div>
      </div>
      <div className="flex flex-col items-center leading-none">
         <span className={cn("text-[9px] font-black uppercase tracking-wider", config.text)}>{config.label}</span>
         <span className="text-[8px] font-bold text-slate-300 mt-0.5 tabular-nums">{current}/{total}</span>
      </div>
    </div>
  );
}

function StatusBadge({ subject, t, isSmall = false }: { subject: SubjectMonitorSummary, t: any, isSmall?: boolean }) {
  const phase = subject.status;
  
  const configs: Record<string, { label: string, color: string, icon: any }> = {
    "Checking In": { label: t("phases.checkingIn") || "Checking In", color: "bg-blue-50 text-blue-600 border-blue-200 shadow-blue-50", icon: <UserPlus className="w-3.5 h-3.5" /> },
    "Ongoing": { label: t("phases.ongoing") || "Ongoing", color: "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-emerald-50", icon: <Activity className="w-3.5 h-3.5" /> },
    "Upcoming": { label: t("phases.upcoming") || "Upcoming", color: "bg-amber-50 text-amber-700 border-amber-200 shadow-amber-50", icon: <Clock className="w-3.5 h-3.5" /> },
    "Completed": { label: t("phases.completed") || "Completed", color: "bg-slate-50 text-slate-500 border-slate-200 shadow-slate-50", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  };

  const config = configs[phase] || configs["Upcoming"];

  if (isSmall) {
    return (
      <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase border shadow-sm", config.color)}>
        {config.icon}
        <span className="hidden sm:inline">{config.label}</span>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase border shadow-md transition-all hover:scale-105", config.color)}>
      {config.icon}
      {config.label}
    </div>
  );
}

function CountdownTimer({ endTime, startTime, status, size = "normal", inverse = false }: { endTime: string, startTime: string, status: string, size?: "normal" | "small", inverse?: boolean }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const diff = end - now;

      if (status !== "Ongoing") {
        setTimeLeft("-- : --");
        return;
      }

      if (diff <= 0) {
        setTimeLeft("00:00");
        return;
      }

      const m = Math.floor(diff / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setIsUrgent(diff < 5 * 60 * 1000);
      setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [endTime, status]);

  return (
    <div className={cn(
      "flex items-center gap-1.5 font-bold tabular-nums",
      isUrgent && !inverse ? "text-red-600 animate-pulse" : inverse ? "text-white" : "text-slate-600",
      size === "normal" ? "text-sm" : "text-[11px]"
    )}>
      <Clock className={cn(size === "normal" ? "w-4 h-4" : "w-3 h-3")} />
      {timeLeft}
    </div>
  );
}

function RoomCard({ session, t }: { session: SessionRoomDetail, t: any }) {
  return (
    <Card className="shadow-lg border-slate-200/80 hover:border-orange-500/50 hover:shadow-orange-100/30 transition-all duration-300 overflow-hidden group/room">
      <div className="p-4 border-b bg-slate-50/50 flex flex-row justify-between items-center group-hover/room:bg-orange-50/20 transition-colors">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
           <span className="text-sm font-black text-slate-800">{t("drilldown.room")} {session.roomNumber}</span>
        </div>
        {session.pendingTickets > 0 && (
          <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-lg shadow-orange-100">
            <Ticket className="w-3 h-3" />
            {session.pendingTickets}
          </div>
        )}
      </div>
      <CardContent className="p-4 flex flex-col gap-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex flex-col">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("drilldown.proctor")}</span>
               <span className={cn("text-xs font-black", !session.proctorOnline && 'text-red-500')}>
                 {session.proctorName || t("drilldown.notInRoom") || "Not Assigned"}
               </span>
            </div>
            <span className={cn("w-2.5 h-2.5 rounded-full ring-4 shadow-sm", session.proctorOnline ? "bg-green-500 ring-green-50 shadow-green-100" : "bg-red-400 ring-red-50")} />
          </div>

          <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex flex-col">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("drilldown.hall")}</span>
               <span className={cn("text-xs font-black", !session.hallInvigilatorOnline && 'text-red-500')}>
                 {session.hallInvigilatorName || t("drilldown.notInRoom") || "Not Assigned"}
               </span>
            </div>
            <span className={cn("w-2.5 h-2.5 rounded-full ring-4 shadow-sm", session.hallInvigilatorOnline ? "bg-green-500 ring-green-50 shadow-green-100" : "bg-red-400 ring-red-50")} />
          </div>
        </div>

        <div className="pt-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("drilldown.checkin")}</span>
            <span className="text-sm font-black text-slate-900">{session.checkedIn}/{session.totalStudents}</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-700", session.checkedIn < session.totalStudents ? "bg-orange-500" : "bg-emerald-500")} 
              style={{ width: `${session.totalStudents > 0 ? (session.checkedIn / session.totalStudents) * 100 : 0}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
