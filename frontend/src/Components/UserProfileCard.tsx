"use client";

import { Box, Text, VStack, HStack, Badge, Button, Select, Icon } from "@/ui";
import { FaUser } from "react-icons/fa";
import { motion } from "framer-motion";

interface UserProfileCardProps {
  id?: number;
  email: string;
  role: string;
  approved: boolean;
  rejectionComment: string | null;
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  onApprove?: () => void;
  onReject?: () => void;
  onDelete?: () => void;
  onEditProfile?: () => void;
  onRoleChange?: (role: string) => void;
  editableRole?: boolean;
  roleOptions?: readonly string[];
  t?: (key: string) => string;
}

export function UserProfileCard({
  email,
  role,
  approved,
  rejectionComment,
  firstName,
  lastName,
  jobTitle,
  department,
  onApprove,
  onReject,
  onDelete,
  onEditProfile,
  onRoleChange,
  editableRole,
  roleOptions = [],
  t = (k: string) => k,
}: UserProfileCardProps) {
  const statusLabel = approved ? t("admin.accepted") : rejectionComment ? t("admin.rejected") : t("admin.waiting");
  const statusColor = approved ? "green" : rejectionComment ? "red" : "yellow";
  const nameLine = [firstName, lastName].filter(Boolean).join(" ").trim();

  return (
    <motion.div
      className="border border-gray-200 dark:border-white/20 rounded-lg p-4 bg-white dark:bg-[#232522] hover:border-gray-400"
      whileHover={{ y: -2, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
      whileTap={{ scale: 0.99 }}
    >
      <HStack spacing={3} align="start">
        <Box className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
          <Icon as={FaUser} boxSize={5} className="text-gray-500" />
        </Box>
        <VStack align="stretch" spacing={1} className="flex-1 min-w-0">
          <Text fontSize="sm" fontWeight={600} noOfLines={1}>
            {email}
          </Text>
          {nameLine ? (
            <Text fontSize="xs" className="text-gray-600 dark:text-gray-400">
              {nameLine}
            </Text>
          ) : null}
          {(jobTitle || department) ? (
            <Text fontSize="xs" className="text-gray-500 dark:text-gray-500 noOfLines={2}">
              {[jobTitle, department].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
          <HStack spacing={2} className="flex-wrap">
            <Badge colorScheme={statusColor} size="sm">
              {statusLabel}
            </Badge>
            {editableRole && roleOptions.length > 0 && onRoleChange ? (
              <Select
                size="sm"
                className="w-auto min-w-[120px]"
                value={role}
                onChange={onRoleChange}
                options={roleOptions.map((r) => ({ value: r, label: r }))}
              />
            ) : (
              <Text fontSize="xs" className="text-gray-500">
                {role}
              </Text>
            )}
          </HStack>
          {rejectionComment != null && rejectionComment !== "" && (
            <Text fontSize="xs" noOfLines={2} className="text-gray-600 dark:text-gray-400 mt-1">
              {rejectionComment}
            </Text>
          )}
          {(onApprove != null || onReject != null || onDelete != null || onEditProfile != null) && (
            <HStack className="mt-2 gap-2 flex-wrap">
              {onEditProfile != null && (
                <Button size="sm" variant="outline" className="border-brand-primary/50 text-brand-primary hover:bg-brand-primary/10" onClick={onEditProfile}>
                  {t("admin.editUser")}
                </Button>
              )}
              {!approved && onApprove != null && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={onApprove}>
                  {t("admin.approve")}
                </Button>
              )}
              {onReject != null && (
                <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={onReject}>
                  {t("admin.reject")}
                </Button>
              )}
              {onDelete != null && (
                <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={onDelete}>
                  {t("admin.remove")}
                </Button>
              )}
            </HStack>
          )}
        </VStack>
      </HStack>
    </motion.div>
  );
}
