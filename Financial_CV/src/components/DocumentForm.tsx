import { useState } from 'react';

type Props = {
  onSubmit: (form: {
    dueDate: string;
    amount: string;
    partner: string;
    partner_bank: string;
    account: string;
  }) => void;
};

const DocumentForm = ({ onSubmit }: Props) => {
  const [form, setForm] = useState({
    dueDate: '',
    amount: '',
    partner: '',
    partner_bank: '',
    account: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit(form);
    }}>
      <label>
        납부일:
        <input name="dueDate" type="date" value={form.dueDate} onChange={handleChange} />
      </label>
      <label>
        금액:
        <input name="amount" value={form.amount} onChange={handleChange} />
      </label>
      <label>
        거래상대:
        <input name="partner" value={form.partner} onChange={handleChange} />
      </label>
      <label>
        은행:
        <input name="partner_bank" value={form.partner_bank} onChange={handleChange} />
      </label>
      <label>
        계좌번호:
        <input name="account" value={form.account} onChange={handleChange} />
      </label>
      <button type="submit">등록하기</button>
    </form>
  );
};

export default DocumentForm;
