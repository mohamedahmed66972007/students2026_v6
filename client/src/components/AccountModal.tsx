import React from "react";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User, Shield } from "lucide-react";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const { user, isAdmin, isMainAdmin } = useTelegramAuth();

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-right">معلومات الحساب</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {user.first_name} {user.last_name}
              </h3>
              <p className="text-sm text-gray-500">
                {user.username ? `@${user.username}` : 'بدون اسم مستخدم'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">معرف المستخدم:</span>
              <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                {user.id}
              </span>
            </div>

            {(isAdmin || isMainAdmin) && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">الصلاحيات:</span>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-blue-600 font-medium">
                    {isMainAdmin ? 'مشرف رئيسي' : 'مشرف'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountModal;