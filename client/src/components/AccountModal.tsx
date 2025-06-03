import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Shield, LogOut, Edit, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const { user, isAdmin, userName, adminNumber, logout, updateUserName } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(userName || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handleSaveName = async () => {
    if (!newName.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم صحيح",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsUpdating(true);
    try {
      const success = await updateUserName(newName.trim());
      if (success) {
        toast({
          title: "تم التحديث",
          description: "تم تحديث الاسم بنجاح",
          duration: 3000,
        });
        setIsEditingName(false);
      } else {
        toast({
          title: "خطأ",
          description: "فشل في تحديث الاسم",
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الاسم",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setNewName(userName || "");
    setIsEditingName(false);
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-right flex items-center gap-2">
            <User className="h-5 w-5" />
            معلومات الحساب
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Info */}
          <div className="space-y-4">
            {isAdmin && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    مشرف
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    لديك صلاحيات إدارية
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  البريد الإلكتروني
                </label>
                <p className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                  {user.email}
                </p>
              </div>

              {(userName || isAdmin) && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    الاسم
                  </label>
                  {isEditingName ? (
                    <div className="space-y-2">
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="أدخل الاسم الجديد"
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveName}
                          disabled={isUpdating}
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Save className="h-3 w-3" />
                          {isUpdating ? "جاري الحفظ..." : "حفظ"}
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          disabled={isUpdating}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <X className="h-3 w-3" />
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 p-2 rounded-md flex-1">
                        {userName || "لم يتم تحديد الاسم"}
                      </p>
                      <Button
                        onClick={() => setIsEditingName(true)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        تعديل
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {isAdmin && adminNumber && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    الرقم
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                    {adminNumber}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  معرف المستخدم
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded-md font-mono">
                  {user.uid}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-4 border-t dark:border-gray-700">
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="w-full flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountModal;
