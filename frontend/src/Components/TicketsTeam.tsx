"use client";

import { useEffect, useState } from "react";
import { Button, Text, HStack, VStack } from "@/ui";
import { useToast } from "@/hooks/useToast";
import { motion } from "framer-motion";
import api from "@/lib/axios";
import type { Ticket } from "@/types";
import { ButtonDownloadExcel } from "./DownloadExcel";
import { IncidentLogCard } from "./IncidentLogCard";

const getTickets = () => api.get("/tickets").then((r) => r.data);
const sendTicketAnswer = (id: number, answer: string) =>
  api.patch(`/tickets/${id}/answer`, { answer }).then((r) => r.data);

export function TicketsTeam() {
  const [data, setData] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [idTicket, setIdTicket] = useState<number | "">("");
  const { toast } = useToast();

  useEffect(() => {
    getTickets()
      .then(setData)
      .catch(() => toast({ title: "Error loading tickets", status: "error", duration: 4000 }))
      .finally(() => setLoading(false));
  }, [toast]);

  async function sendAnswer() {
    const answerValue = answer.split("-")[0];
    const ticketId = idTicket;

    if (!ticketId || answerValue === "") return;
    try {
      const updated = await sendTicketAnswer(ticketId, answerValue);
      setData((prev) =>
        prev.map((x) => (x.id === ticketId ? { ...x, answer: updated.answer, status: updated.status } : x))
      );
      setAnswer("");
      setIdTicket("");
      toast({ title: "Success.", description: "Your reply has been sent.", status: "success", duration: 4000 });
    } catch {
      toast({ title: "Error.", description: "Failed to send reply.", status: "error", duration: 4000 });
    }
  }

  if (loading) return <Text className="py-4 text-[#1F6A5C] dark:text-[#F4F3F4]/45">Loading...</Text>;

  const optSelected = (opt: string, idx: number) =>
    answer.split("-")[0] === opt && Number(answer.split("-")[1]) === idx;

  return (
    <div className="flex flex-col gap-5 w-full max-w-full">
      <HStack className="w-full justify-between items-center flex-wrap gap-3">
        <Text fontSize="xl" fontWeight={600} className="text-[#1C1E1C] dark:text-[#F4F3F4]">
          History
        </Text>
        <ButtonDownloadExcel data={data} />
      </HStack>
      <VStack spacing={4} className="w-full">
        {data.map((x, i) => (
          <IncidentLogCard key={x.id} ticket={x} index={i} answerHeading="Response">
            {x.answer === "" ? (
              <VStack spacing={4} align="stretch" className="w-full">
                <Text fontSize="xs" fontWeight={600} className="uppercase tracking-wide text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45">
                  Your response
                </Text>
                {(x.type === "Activity Verification" || x.type === "Communication Channel") ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    {(["Aware", "Not Aware", "Description is not clear"] as const).map((opt) => (
                      <Button
                        key={opt}
                        type="button"
                        size="sm"
                        variant="outline"
                        className={
                          optSelected(opt, i)
                            ? "border-[#1F6A5C] text-[#1F6A5C] dark:border-[#50BFA0] dark:text-[#F4F3F4]/55"
                            : "border-[#1F6A5C]/20 dark:border-white/20"
                        }
                        onClick={() => {
                          setAnswer(`${opt}-${i}`);
                          setIdTicket(x.id);
                        }}
                      >
                        {opt}
                      </Button>
                    ))}
                    <Button
                      as={motion.button}
                      type="button"
                      size="sm"
                      isDisabled={idTicket !== x.id}
                      className="bg-[#1F6A5C] hover:bg-[#267E6D] text-white sm:ml-auto"
                      onClick={sendAnswer}
                      whileHover={{ scale: idTicket === x.id ? 1.02 : 1 }}
                      whileTap={{ scale: idTicket === x.id ? 0.98 : 1 }}
                    >
                      Send a reply
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={
                        optSelected("Acknowledged", i)
                          ? "border-[#1F6A5C] text-[#1F6A5C] dark:border-[#50BFA0] dark:text-[#F4F3F4]/55"
                          : "border-[#1F6A5C]/20 dark:border-white/20"
                      }
                      onClick={() => {
                        setAnswer(`Acknowledged-${i}`);
                        setIdTicket(x.id);
                      }}
                    >
                      Acknowledged
                    </Button>
                    <Button
                      as={motion.button}
                      type="button"
                      size="sm"
                      isDisabled={idTicket !== x.id}
                      className="bg-[#1F6A5C] hover:bg-[#267E6D] text-white sm:ml-auto"
                      onClick={sendAnswer}
                      whileHover={{ scale: idTicket === x.id ? 1.02 : 1 }}
                      whileTap={{ scale: idTicket === x.id ? 0.98 : 1 }}
                    >
                      Send a reply
                    </Button>
                  </div>
                )}
              </VStack>
            ) : (
              <VStack spacing={2} align="stretch" className="w-full">
                <Text fontSize="xs" fontWeight={600} className="uppercase tracking-wide text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45">
                  Your answer
                </Text>
                <Text fontSize="sm" className="text-[#103E36] dark:text-[#F4F3F4]/80 whitespace-pre-wrap leading-relaxed">
                  {x.answer}
                </Text>
              </VStack>
            )}
          </IncidentLogCard>
        ))}
      </VStack>
    </div>
  );
}
