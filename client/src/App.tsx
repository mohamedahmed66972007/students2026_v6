import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TelegramAuthProvider } from "@/hooks/useTelegramAuth";
import Layout from "@/components/Layout";

import Files from "@/pages/Files";
import StudySchedule from "@/pages/StudySchedule";
import Exams from "@/pages/Exams";
import Analytics from "@/pages/Analytics";
import Friends from "@/pages/Friends";
import Quizzes from "@/pages/Quizzes";
import TakeQuiz from "@/pages/TakeQuiz";
import QuizResults from "@/pages/QuizResults";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <TelegramAuthProvider>
            <Layout>
              <Switch>
                <Route path="/" component={Files} />
                <Route path="/files" component={Files} />
                <Route path="/study-schedule" component={StudySchedule} />
                <Route path="/exams" component={Exams} />
                <Route path="/analytics" component={Analytics} />
                <Route path="/friends" component={Friends} />
                <Route path="/quizzes" component={Quizzes} />
                <Route path="/quiz/:code" component={TakeQuiz} />
                <Route path="/quiz/:code/results" component={QuizResults} />
                <Route component={NotFound} />
              </Switch>
            </Layout>
          </TelegramAuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;