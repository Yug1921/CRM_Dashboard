"use client"

import * as React from "react"
import { m } from "framer-motion"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

const containerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
}

export default function SettingsPage() {
  return (
    <m.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-bg"
    >
      <div className="relative overflow-hidden px-6 py-8">
        <div className="pointer-events-none absolute right-0 top-10 h-60 w-80 bg-[radial-gradient(circle_at_top,var(--accent-dim),transparent_70%)]" />
        <div className="mx-auto flex max-w-[900px] flex-col gap-6">
          <div>
            <div className="text-lg font-semibold text-text">Settings</div>
            <div className="text-xs text-text-muted">Configure outreach defaults and alerts</div>
          </div>

          <Card className="border border-border bg-surface">
            <CardHeader>
              <CardTitle>Outreach defaults</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldSet>
                <FieldLegend>AI drafting</FieldLegend>
                <FieldDescription>These settings control the default outreach prompt.</FieldDescription>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Default outreach type</FieldLabel>
                    <Select defaultValue="direct_message">
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="connection_request">Connection request</SelectItem>
                        <SelectItem value="direct_message">Direct message</SelectItem>
                        <SelectItem value="follow_up">Follow up</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Default tone</FieldLabel>
                    <Select defaultValue="professional">
                      <SelectTrigger>
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <Card className="border border-border bg-surface">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field orientation="horizontal">
                  <Checkbox id="daily-summary" defaultChecked />
                  <FieldContent>
                    <FieldLabel htmlFor="daily-summary">Daily summary email</FieldLabel>
                    <FieldDescription>Receive a summary of new leads and replies.</FieldDescription>
                  </FieldContent>
                </Field>
                <Field orientation="horizontal">
                  <Checkbox id="live-alerts" defaultChecked />
                  <FieldContent>
                    <FieldLabel htmlFor="live-alerts">Live lead alerts</FieldLabel>
                    <FieldDescription>Show realtime toast notifications for new leads.</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card className="border border-border bg-surface">
            <CardHeader>
              <CardTitle>API configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel>API base URL</FieldLabel>
                  <Input value={process.env.NEXT_PUBLIC_API_BASE ?? ""} readOnly />
                  <FieldDescription>Configured via NEXT_PUBLIC_API_BASE.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>Workspace notes</FieldLabel>
                  <Input placeholder="Add internal notes" />
                </Field>
              </FieldGroup>
              <div className="mt-4 flex justify-end">
                <Button>Save settings</Button>
              </div>
            </CardContent>
          </Card>

          {/* TODO(phase-2): Add user management, integrations, and role-based access control. */}
        </div>
      </div>
    </m.div>
  )
}
