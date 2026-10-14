import { redirect } from "next/navigation";
import { customer } from "@/lib/customer";

export default function Home() {
  redirect(`/incidents/${customer.leadIncident}`);
}
