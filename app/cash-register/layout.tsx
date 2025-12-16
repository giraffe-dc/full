import { CashRegisterNav } from "../../components/cash-register/CashRegisterNav";

export default function CashRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* <CashRegisterNav /> */}
      {children}
    </>
  );
}
