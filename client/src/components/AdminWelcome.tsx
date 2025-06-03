
import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminWelcomeProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminWelcome: React.FC<AdminWelcomeProps> = ({ isOpen, onClose }) => {
  const { userName, adminNumber, updateUserName, user, markWelcomeSeen } = useAuth();
  const [newName, setNewName] = useState(userName);
  const { toast } = useToast();

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newName.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال الاسم",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "خطأ",
        description: "خطأ في تحديد المستخدم",
        variant: "destructive",
      });
      return;
    }

    try {
      const success = await updateUserName(newName);
      
      if (success) {
        // تسجيل أن المشرف قد رأى رسالة الترحيب
        markWelcomeSeen(user.uid, newName);
        
        toast({
          title: "تم التحديث بنجاح",
          description: "تم تحديث اسمك بنجاح",
        });
        onClose();
      } else {
        toast({
          title: "خطأ",
          description: "فشل في تحديث الاسم",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الاسم",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-right">
            مرحباً بك أيها المشرف رقم {adminNumber}
          </DialogTitle>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute left-2 top-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <form onSubmit={handleUpdateName} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-name">اسمك</Label>
            <Input
              id="admin-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="أدخل اسمك"
              required
            />
          </div>
          
          <DialogFooter className="justify-end mt-6">
            <Button type="submit">
              حفظ الاسم
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminWelcome;
