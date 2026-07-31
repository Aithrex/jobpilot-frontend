import { useNavigate } from "react-router-dom";
import PipelineTab from "@/components/resume/PipelineTab";

/** Shell-mounted pipeline: maps legacy tab hops onto `/app` routes. */
export default function PipelineSection() {
  const navigate = useNavigate();
  return (
    <PipelineTab
      onNavigate={(tab) => {
        if (tab === "applications") {
          navigate("/app/apply/tracker");
          return;
        }
        if (tab === "jobs") {
          navigate("/app/jobs/for-you");
          return;
        }
        navigate("/app/home");
      }}
    />
  );
}
