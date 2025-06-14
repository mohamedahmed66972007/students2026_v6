import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFirebaseExams } from "@/hooks/useFirebaseExams";
import ExamList from "@/components/ExamWeek";
import AddExamModal from "@/components/AddExamModal";
import { Button } from "@/components/ui/button";
import { PlusIcon, Download, LayoutGrid, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SubjectIcon, getSubjectLightColor, getSubjectName } from "@/components/SubjectIcons";
import dayjs from "dayjs";
import html2pdf from "html2pdf.js";

const Exams: React.FC = () => {
  const { isAdmin } = useAuth();
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const { exams, isLoading, error, deleteExam } = useFirebaseExams();
  const { toast } = useToast();
  const [tableUpdateTrigger, setTableUpdateTrigger] = useState(0);

  // حذف الاختبارات المنتهية تلقائياً
  useEffect(() => {
    if (exams && exams.length > 0) {
      const now = dayjs();
      const expiredExams = exams.filter(exam => {
        const examDate = dayjs(exam.date).hour(3).minute(0);
        return examDate.isBefore(now);
      });
      
      expiredExams.forEach(exam => {
        deleteExam(exam.id);
      });
    }
  }, [exams, deleteExam]);

  // تحديث الوقت المتبقي كل ثانية
  useEffect(() => {
    const interval = setInterval(() => {
      setTableUpdateTrigger(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getSubjectNameLocal = (subject: string) => {
    const subjects: Record<string, string> = {
      arabic: "اللغة العربية",
      english: "اللغة الإنجليزية", 
      math: "الرياضيات",
      chemistry: "الكيمياء",
      physics: "الفيزياء",
      biology: "الأحياء",
      geology: "الجيولوجيا",
      constitution: "الدستور",
      islamic: "التربية الإسلامية"
    };
    return subjects[subject] || subject;
  };

  const getDayInArabic = (date: string | dayjs.Dayjs) => {
    const dayNames = {
      'Sunday': 'الأحد',
      'Monday': 'الاثنين', 
      'Tuesday': 'الثلاثاء',
      'Wednesday': 'الأربعاء',
      'Thursday': 'الخميس',
      'Friday': 'الجمعة',
      'Saturday': 'السبت'
    };
    
    const dayInEnglish = dayjs(date).format("dddd");
    return dayNames[dayInEnglish as keyof typeof dayNames] || dayInEnglish;
  };

  const exportToPDF = async () => {
    if (!exams || exams.length === 0) {
      toast({
        title: "لا يوجد جدول",
        description: "لا توجد امتحانات لتصديرها",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      const container = document.createElement("div");
      container.style.direction = "rtl";
      container.style.fontFamily = "'Cairo', 'Arial', sans-serif";
      container.style.padding = "20px";
      container.style.backgroundColor = "#ffffff";
      container.style.color = "#000000";

      const themeStyles = `
        <style>
          * {
            font-family: 'Cairo', 'Arial', sans-serif;
            line-height: 1.4;
          }
          .main-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0 30px 0;
            border: 1px solid #e5e7eb;
          }
          .table-header {
            background-color: #f9fafb;
            font-weight: 500;
            padding: 8px 6px;
            border: 1px solid #e5e7eb;
            text-align: center;
            font-size: 14px;
          }
          .table-cell {
            padding: 8px 6px;
            border: 1px solid #e5e7eb;
            vertical-align: top;
            text-align: center;
          }
          .subject-name {
            font-size: 14px;
            margin-bottom: 5px;
          }
          .lessons-list {
            font-size: 13px;
          }
          .lesson-item {
            margin: 2px 0;
            padding: 2px 0;
          }
        </style>
      `;

      let htmlContent = themeStyles;

      const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (sortedExams.length > 0) {
        htmlContent += `
          <table class="main-table">
            <thead>
              <tr>
                <th class="table-header" style="width: 15%;">اليوم</th>
                <th class="table-header" style="width: 20%;">التاريخ</th>
                <th class="table-header" style="width: 25%;">المادة</th>
                <th class="table-header" style="width: 40%;">الدروس المقررة</th>
              </tr>
            </thead>
            <tbody>
        `;
        
        sortedExams.forEach(exam => {
          htmlContent += `
            <tr>
              <td class="table-cell" style="vertical-align: middle;">
                ${exam.day}
              </td>
              <td class="table-cell" style="vertical-align: middle;">
                ${dayjs(exam.date).format("DD/MM/YYYY")}
              </td>
              <td class="table-cell" style="vertical-align: middle;">
                <div class="subject-name">
                  ${getSubjectNameLocal(exam.subject)}
                </div>
              </td>
              <td class="table-cell">
                <div class="lessons-list">
                  ${exam.topics.map(topic => `
                    <div class="lesson-item">
                      <span style="color: #000000;">●</span> ${topic}
                    </div>
                  `).join('')}
                </div>
              </td>
            </tr>
          `;
        });
        
        htmlContent += `
            </tbody>
          </table>
        `;
      }

      container.innerHTML = htmlContent;

      const options = {
        margin: [15, 15, 15, 15],
        filename: `جدول_الامتحانات_${dayjs().format("YYYY-MM-DD")}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff"
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        }
      };

      await html2pdf().from(container).set(options).save();
      
      toast({
        title: "تم تصدير الجدول",
        description: "تم تصدير جدول الامتحانات بصيغة PDF بنجاح",
        duration: 3000,
      });

    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير جدول الامتحانات",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const TableView = () => (
    <div className="w-full" style={{ direction: 'rtl' }}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
                <th className="px-2 sm:px-4 py-3 text-right text-xs font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600 first:rounded-tr-xl last:rounded-tl-xl">التاريخ</th>
                <th className="px-2 sm:px-4 py-3 text-right text-xs font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">المادة</th>
                <th className="px-2 sm:px-4 py-3 text-right text-xs font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">الوقت المتبقي</th>
                <th className="px-2 sm:px-4 py-3 text-right text-xs font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">الدروس المقررة</th>
                {isAdmin && <th className="px-2 sm:px-4 py-3 text-center text-xs font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600 last:rounded-tl-xl">الإجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {[...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((exam, index) => {
                // إضافة trigger للتحديث
                tableUpdateTrigger;
                const examDate = dayjs(exam.date).hour(3).minute(0);
                const now = dayjs();
                const diffDays = examDate.diff(now, 'day');
                const diffHours = examDate.diff(now, 'hour') % 24;
                const diffMinutes = examDate.diff(now, 'minute') % 60;
                
                let remainingTime = '';
                let remainingTimeColor = '';
                
                const diffSeconds = examDate.diff(now, 'second') % 60;
                
                if (examDate.isBefore(now)) {
                  remainingTime = "انتهى";
                  remainingTimeColor = "text-red-600 dark:text-red-400 font-bold";
                } else if (diffDays > 7) {
                  remainingTime = `${diffDays} يوماً`;
                  remainingTimeColor = "text-green-600 dark:text-green-400 font-medium";
                } else if (diffDays > 3) {
                  remainingTime = `${diffDays} أيام`;
                  remainingTimeColor = "text-yellow-600 dark:text-yellow-400 font-medium";
                } else if (diffDays >= 1) {
                  remainingTime = `${diffDays} يوم ${diffHours.toString().padStart(2, '0')}:${diffMinutes.toString().padStart(2, '0')}:${diffSeconds.toString().padStart(2, '0')}`;
                  remainingTimeColor = "text-orange-600 dark:text-orange-400 font-semibold";
                } else {
                  remainingTime = `${diffHours.toString().padStart(2, '0')}:${diffMinutes.toString().padStart(2, '0')}:${diffSeconds.toString().padStart(2, '0')}`;
                  if (diffHours > 0) {
                    remainingTimeColor = "text-red-600 dark:text-red-400 font-bold";
                  } else if (diffMinutes > 0) {
                    remainingTimeColor = "text-red-700 dark:text-red-300 font-bold animate-pulse";
                  } else {
                    remainingTimeColor = "text-red-800 dark:text-red-200 font-bold animate-pulse";
                  }
                }

                return (
                  <tr key={exam.id || `exam-${exam.subject}-${exam.date}-${index}`} className="hover:bg-blue-50 dark:hover:bg-gray-800 transition-all duration-200">
                    <td className="px-2 sm:px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                      <div className="font-medium text-xs sm:text-sm">{examDate.format("DD/MM/YYYY")}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{getDayInArabic(examDate)}</div>
                    </td>
                    <td className="px-2 sm:px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`p-1.5 sm:p-2 rounded-lg ${getSubjectLightColor(exam.subject as any)}`}>
                          <SubjectIcon subject={exam.subject as any} size={14} className="sm:w-4 sm:h-4" />
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                          {getSubjectNameLocal(exam.subject)}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <span className={`text-xs sm:text-sm font-semibold ${remainingTimeColor}`}>
                        {remainingTime}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="space-y-0.5 sm:space-y-1">
                        {exam.topics.map((topic, topicIndex) => (
                          <div key={topicIndex} className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-500 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                            <span className="leading-tight">{topic}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-2 sm:px-4 py-3 text-center border-b border-gray-100 dark:border-gray-700">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteExam(exam.id)}
                          className="text-xs px-1.5 py-1 sm:px-2"
                        >
                          حذف
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">جدول الاختبارات</h2>

        <div className="flex gap-2">
          <Button onClick={exportToPDF} variant="outline">
            <Download className="h-4 w-4 ml-2" />
            تصدير PDF
          </Button>
          
          <div className="flex border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="rounded-none border-none"
            >
              <LayoutGrid className="h-4 w-4 ml-2" />
              <span className="hidden sm:inline">بطاقات</span>
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-none border-none"
            >
              <List className="h-4 w-4 ml-2" />
              <span className="hidden sm:inline">جدول</span>
            </Button>
          </div>

          {isAdmin && (
            <Button 
              onClick={() => setShowAddExamModal(true)} 
              className="flex items-center space-x-1 space-x-reverse"
            >
              <PlusIcon className="h-4 w-4 ml-2" />
              <span>إضافة اختبار</span>
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
          <p className="mt-4">جاري تحميل جدول الاختبارات...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10 text-destructive">
          <p>حدث خطأ أثناء تحميل جدول الاختبارات. يرجى المحاولة مرة أخرى.</p>
        </div>
      ) : exams && exams.length > 0 ? (
        viewMode === 'table' ? (
          <TableView />
        ) : (
          <div className="w-full space-y-4" style={{ direction: 'rtl' }}>
            {[...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((exam, index) => {
              // إضافة trigger للتحديث
              tableUpdateTrigger;
              const examDate = dayjs(exam.date).hour(3).minute(0);
              const now = dayjs();
              const diffDays = examDate.diff(now, 'day');
              const diffHours = examDate.diff(now, 'hour') % 24;
              const diffMinutes = examDate.diff(now, 'minute') % 60;
              
              let remainingTime = '';
              let remainingTimeColor = '';
              
              const diffSeconds = examDate.diff(now, 'second') % 60;
              
              if (examDate.isBefore(now)) {
                remainingTime = "انتهى";
                remainingTimeColor = "text-red-600 dark:text-red-400 font-bold";
              } else if (diffDays > 7) {
                remainingTime = `${diffDays} يوماً`;
                remainingTimeColor = "text-green-600 dark:text-green-400 font-medium";
              } else if (diffDays > 3) {
                remainingTime = `${diffDays} أيام`;
                remainingTimeColor = "text-yellow-600 dark:text-yellow-400 font-medium";
              } else if (diffDays >= 1) {
                remainingTime = `${diffDays} يوم ${diffHours.toString().padStart(2, '0')}:${diffMinutes.toString().padStart(2, '0')}:${diffSeconds.toString().padStart(2, '0')}`;
                remainingTimeColor = "text-orange-600 dark:text-orange-400 font-semibold";
              } else {
                remainingTime = `${diffHours.toString().padStart(2, '0')}:${diffMinutes.toString().padStart(2, '0')}:${diffSeconds.toString().padStart(2, '0')}`;
                if (diffHours > 0) {
                  remainingTimeColor = "text-red-600 dark:text-red-400 font-bold";
                } else if (diffMinutes > 0) {
                  remainingTimeColor = "text-red-700 dark:text-red-300 font-bold animate-pulse";
                } else {
                  remainingTimeColor = "text-red-800 dark:text-red-200 font-bold animate-pulse";
                }
              }

              return (
                <div key={exam.id || `exam-${exam.subject}-${exam.date}-${index}`} 
                     className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-800 transition-all duration-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getSubjectLightColor(exam.subject as any)}`}>
                        <SubjectIcon subject={exam.subject as any} size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {getSubjectNameLocal(exam.subject)}
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          <div className="font-medium">{examDate.format("DD/MM/YYYY")}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{getDayInArabic(examDate)}</div>
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteExam(exam.id)}
                        className="text-xs px-2 py-1"
                      >
                        حذف
                      </Button>
                    )}
                  </div>
                  
                  <div className="mb-3">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">الوقت المتبقي</span>
                    <div className={`text-sm font-semibold ${remainingTimeColor} mt-1`}>
                      {remainingTime}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">الدروس المقررة</span>
                    <div className="mt-2 space-y-1">
                      {exam.topics.map((topic, topicIndex) => (
                        <div key={topicIndex} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span>{topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">لا توجد اختبارات متاحة حالياً</p>
          {isAdmin && (
            <Button onClick={() => setShowAddExamModal(true)} variant="outline" className="mt-4">
              إضافة اختبار
            </Button>
          )}
        </div>
      )}

      <AddExamModal 
        isOpen={showAddExamModal} 
        onClose={() => setShowAddExamModal(false)} 
      />
    </div>
  );
};

export default Exams;
