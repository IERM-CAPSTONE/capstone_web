"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  FileText,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  AlertCircle,
  Bell,
  Megaphone,
  CheckCircle2,
  AlertTriangle,
  History,
  LayoutGrid,
  List as ListIcon,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { templatesApi, AnnouncementTemplate } from "@/lib/api/templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TemplatesPage() {
  const t = useTranslations("Templates");
  const commonT = useTranslations("Common");
  
  const [templates, setTemplates] = useState<AnnouncementTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampus, setSelectedCampus] = useState<string>("");
  const [editingTemplate, setEditingTemplate] = useState<AnnouncementTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "INFO" as "INFO" | "WARNING" | "URGENT",
    campus: ""
  });

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await templatesApi.getTemplates({
        search: searchTerm,
        campus: selectedCampus || undefined
      });
      console.log('FETCHED TEMPLATES:', data);
      setTemplates(data);
    } catch (error) {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCampus]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates, selectedCampus]);

  const handleOpenDialog = (template?: AnnouncementTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        title: template.title,
        content: template.content,
        type: template.type,
        campus: template.campus || ""
      });
    } else {
      setEditingTemplate(null);
      setFormData({ title: "", content: "", type: "INFO", campus: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      if (editingTemplate) {
        await templatesApi.updateTemplate(editingTemplate.id, formData);
        toast.success("Template updated successfully");
      } else {
        await templatesApi.createTemplate(formData);
        toast.success("Template created successfully");
      }
      setIsDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      toast.error("Process failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      try {
        await templatesApi.deleteTemplate(id);
        toast.success("Deleted successfully");
        fetchTemplates();
      } catch (error) {
        toast.error("Delete failed");
      }
    }
  };

  const filteredTemplates = (templates || []).filter(t => 
    (t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (type: string) => {
    switch (type) {
      case "INFO": return "bg-blue-500 shadow-blue-200 text-blue-500";
      case "WARNING": return "bg-orange-500 shadow-orange-200 text-orange-500";
      case "URGENT": return "bg-red-500 shadow-red-200 text-red-500";
      default: return "bg-slate-500 shadow-slate-200 text-slate-500";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "INFO": return <Bell className="w-5 h-5" />;
      case "WARNING": return <AlertTriangle className="w-5 h-5" />;
      case "URGENT": return <Megaphone className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-screen">
      {/* Header section: Compact & Professional */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-100">
               <FileText className="w-5 h-5" />
             </div>
             <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
               Broadcast Templates
             </h1>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
             Pre-defined announcement library for instant communication
          </p>
        </div>
        
        <Button 
          onClick={() => handleOpenDialog()}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-11 px-6 shadow-lg shadow-orange-100 transition-all active:scale-95 group"
        >
          <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
          <span className="font-black uppercase tracking-widest text-[10px]">Create New Template</span>
        </Button>
      </div>

      {/* Analytics/Summary Cards: Compact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
         {[
           { label: "Informational", count: (templates || []).filter(t => t.type === "INFO").length, color: "blue", icon: <Bell className="w-4 h-4" /> },
           { label: "Warnings", count: (templates || []).filter(t => t.type === "WARNING").length, color: "orange", icon: <AlertTriangle className="w-4 h-4" /> },
           { label: "Urgent Alerts", count: (templates || []).filter(t => t.type === "URGENT").length, color: "red", icon: <Megaphone className="w-4 h-4" /> }
         ].map((stat, i) => (
           <Card key={i} className="border-none shadow-sm bg-white overflow-hidden rounded-[22px] group hover:shadow-md transition-all duration-500 ring-1 ring-slate-100">
              <div className="p-4 flex items-center justify-between">
                 <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-xl font-black text-slate-900">{stat.count}</p>
                 </div>
                 <div className={cn(
                    "p-2.5 rounded-xl transition-all duration-500",
                    stat.color === 'blue' ? "bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white" :
                    stat.color === 'orange' ? "bg-orange-50 text-orange-500 group-hover:bg-orange-500 group-hover:text-white" :
                    "bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white"
                 )}>
                    {stat.icon}
                 </div>
              </div>
           </Card>
         ))}
      </div>

      {/* Controls Bar: Compact */}
      <div className="bg-white p-2 rounded-[22px] shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row items-center gap-4">
         <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
            <Input 
              placeholder="Search by title or content..."
              className="pl-11 h-10 bg-slate-50/50 border-none rounded-2xl text-[11px] font-bold focus:ring-2 focus:ring-slate-900/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchTemplates()}
            />
         </div>
         <div className="flex items-center gap-1.5 p-1 bg-slate-50/50 rounded-2xl">
            <button 
              onClick={() => setSelectedCampus("")}
              className={cn(
                "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                selectedCampus === "" ? "bg-white text-orange-500 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              All
            </button>
            {["HCM", "HN", "DN", "QN", "CT"].map(campus => (
              <button 
                key={campus}
                onClick={() => setSelectedCampus(campus)}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  selectedCampus === campus ? "bg-white text-orange-500 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {campus}
              </button>
            ))}
         </div>
      </div>

      {/* Templates Grid: Responsive & Clean */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredTemplates.map((template) => (
          <Card 
            key={template.id} 
            className="group relative border-none bg-white rounded-[40px] shadow-[0_4px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.08)] transition-all duration-700 overflow-hidden ring-1 ring-slate-100"
          >
            {/* Status bar */}
            <div className={cn("absolute top-0 left-0 right-0 h-1.5", 
              template.type === 'INFO' ? "bg-blue-500" : template.type === 'WARNING' ? "bg-orange-500" : "bg-red-500"
            )} />

            <div className="p-6 pb-4 flex flex-col h-full">
               <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "p-2.5 rounded-xl shadow-sm",
                    template.type === 'INFO' ? "bg-blue-50 text-blue-500" : 
                    template.type === 'WARNING' ? "bg-orange-50 text-orange-500" : 
                    "bg-red-50 text-red-500"
                  )}>
                    {getIcon(template.type)}
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                     <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(template)} className="text-slate-400 hover:text-orange-500 rounded-lg hover:bg-orange-50 h-8 w-8 p-0">
                        <Edit className="w-3.5 h-3.5" />
                     </Button>
                     <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)} className="text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 h-8 w-8 p-0">
                        <Trash2 className="w-3.5 h-3.5" />
                     </Button>
                  </div>
               </div>
 
               <div className="space-y-2 mb-6 flex-1">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight leading-6 line-clamp-1">{template.title}</h3>
                  <p className="text-slate-500 text-[11px] font-medium leading-relaxed line-clamp-3">
                    {template.content}
                  </p>
               </div>
 
                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                   <div className="flex gap-2">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                        template.type === 'INFO' ? "bg-blue-50 text-blue-500" : 
                        template.type === 'WARNING' ? "bg-orange-50 text-orange-500" : 
                        "bg-red-50 text-red-500"
                      )}>
                        {template.type}
                      </span>
                      {template.campus && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          {template.campus}
                        </span>
                      )}
                   </div>
                   <span className="text-[9px] font-bold text-slate-300 uppercase">
                     {new Date(template.createdAt).toLocaleDateString()}
                   </span>
                </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && !loading && (
        <Card className="p-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 rounded-[50px] bg-slate-50 group-hover:border-slate-300 transition-all">
           <div className="p-6 bg-white rounded-[40px] shadow-sm mb-6">
              <History className="w-12 h-12 text-slate-200" />
           </div>
           <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">No templates found</h3>
           <p className="text-slate-400 text-sm max-w-xs font-medium uppercase tracking-widest">Create pre-defined messages to start broadcasting to all exam rooms</p>
           <Button variant="outline" onClick={() => handleOpenDialog()} className="mt-8 rounded-2xl border-2 px-8 font-black uppercase tracking-widest text-xs h-12">
              Add First Template
           </Button>
        </Card>
      )}

      {/* Create/Edit Modal: Compact */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl p-0 border-none rounded-[30px] shadow-2xl overflow-hidden bg-white">
          <div className="p-8">
            <DialogHeader className="mb-6 text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-100">
                  {editingTemplate ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <DialogTitle className="text-xl font-black text-slate-900 tracking-tight uppercase">
                  {editingTemplate ? "Update Template" : "New Template"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                {editingTemplate ? "Modify your existing announcement kịch bản" : "Design a new communication template for exam proctors"}
              </DialogDescription>
            </DialogHeader>
 
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest ml-1">Template Title</label>
                <Input 
                  placeholder="e.g., Exam Start Instructions"
                  className="h-11 bg-slate-50/50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-slate-900/10 px-5 shadow-inner"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
 
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest ml-1">Type of Signal</label>
                <div className="grid grid-cols-3 gap-3">
                   {["INFO", "WARNING", "URGENT"].map((type) => (
                     <button
                        key={type}
                        onClick={() => setFormData({...formData, type: type as any})}
                        className={cn(
                          "h-11 rounded-xl border-2 font-black text-[9px] uppercase tracking-widest transition-all active:scale-95",
                          formData.type === type 
                           ? "border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-100"
                           : "border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200"
                        )}
                     >
                        {type}
                     </button>
                   ))}
                </div>
              </div>
 
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest ml-1">Message Content</label>
                <textarea 
                  placeholder="Example: The exam in {room} is delayed by {time} mins because {reason}..."
                  className="w-full min-h-[140px] bg-slate-50/50 border-none rounded-[22px] p-5 text-xs font-bold focus:ring-2 focus:ring-orange-500/10 shadow-inner resize-none"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest ml-1">Target Campus (Optional)</label>
                <div className="flex flex-wrap gap-2">
                   {["HCM", "HN", "DN", "QN", "CT"].map((campus) => (
                     <button
                        key={campus}
                        onClick={() => setFormData({...formData, campus: formData.campus === campus ? "" : campus})}
                        className={cn(
                          "px-4 py-2 rounded-xl border-2 font-black text-[9px] uppercase tracking-widest transition-all active:scale-95",
                          formData.campus === campus 
                           ? "border-orange-500 bg-orange-600 text-white shadow-md shadow-orange-100"
                           : "border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200"
                        )}
                     >
                        {campus}
                     </button>
                   ))}
                </div>
              </div>
            </div>
 
            <div className="mt-8 flex gap-3">
               <Button 
                variant="ghost" 
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 h-11 rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-400"
               >
                 Cancel
               </Button>
               <Button 
                onClick={handleSubmit}
                className="flex-1 h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-100 active:scale-95"
               >
                 {editingTemplate ? "Save Changes" : "Create Template"}
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
