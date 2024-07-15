export function Tabs({ tabKey }) {
  var tabs = [
    {
      key: "profile",
      title: "Profile",
      href: "/account/profile",
      active: false,
    },
    {
      key: "password",
      title: "Change Password",
      href: "/account/password",
      active: false,
    },
  ];

  return tabs.map((tab) => {
    if (tab.key == tabKey) {
      tab.active = true;
    }

    return tab;
  });
}
