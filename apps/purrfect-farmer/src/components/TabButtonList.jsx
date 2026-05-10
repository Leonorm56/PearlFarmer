import useAppContext from "@/hooks/useAppContext";
import { Dialog } from "radix-ui";
import { memo, useMemo } from "react";

import NileChainLogo from "@/assets/images/nilechain-logo.svg";

import AccountPicker from "./AccountPicker";
import TabButton from "./TabButton";
import Container from "./Container";

export default memo(function TabButtonList({ tabs }) {
  const {
    account,
    mirror,
    settings,
    sharedSettings,
    showAccountPicker,
    setShowAccountPicker,
    dispatchAndSetShowAccountPicker,
  } = useAppContext();
  const otherTabs = useMemo(() => tabs.slice(1), [tabs]);
  const userFullName = useMemo(
    () =>
      account.user
        ? [account.user["first_name"], account.user["last_name"]]
            .filter(Boolean)
            .join(" ")
        : "",
    [account]
  );

  return (
    <div className="border-b dark:border-neutral-600">
      <Container className="flex items-center gap-2 p-0 pr-2 shrink-0">
        <div
          className={cn(
            "grow basis-0",
            "relative z-0",
            "flex shrink-0 py-2",
            "overflow-auto"
          )}
        >
          {/* Main */}
          <div className="sticky left-0 px-2 bg-neutral-50 z-1 dark:bg-neutral-900 shrink-0">
            <TabButton
              key={tabs[0].id}
              tab={tabs[0]}
              showMirrorStatus={sharedSettings.enableMirror}
              mirrorIsConnected={mirror.connected}
            />
          </div>

          {/* Others */}
          <div className="flex gap-2 flex-nowrap shrink-0">
            {otherTabs.map((tab) => (
              <TabButton key={tab.id} tab={tab} />
            ))}
          </div>
        </div>

        {/* Account Picker */}
        <Dialog.Root
          open={showAccountPicker}
          onOpenChange={dispatchAndSetShowAccountPicker}
        >
          <Dialog.Trigger
            title={userFullName}
            className="shrink-0 rounded-full"
          >
            <img
              src={NileChainLogo}
              className="size-8"
            />
          </Dialog.Trigger>

          <AccountPicker />
        </Dialog.Root>
      </Container>
    </div>
  );
});


