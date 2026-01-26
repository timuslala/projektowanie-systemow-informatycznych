import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verify = async () => {
            const email = searchParams.get('email');
            const code = searchParams.get('code');

            if (!email || !code) {
                setStatus('error');
                setMessage('Invalid verification link.');
                return;
            }

            try {
                // The backend endpoint is GET /accounts/validate/?email=...&code=...
                await api.get(`/accounts/validate/`, {
                    params: { email, code }
                });
                setStatus('success');
            } catch (err: any) {
                console.error(err);
                setStatus('error');
                setMessage(err.response?.data?.message || err.response?.data?.code || 'Verification failed.');
            }
        };

        verify();
    }, [searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-white relative">
            <Card className="w-full max-w-md text-center shadow-none border-none">
                <div className="flex flex-col items-center gap-4">
                    {status === 'verifying' && (
                        <>
                            <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                            <h2 className="text-xl font-bold text-slate-900">Verifying your email...</h2>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="w-16 h-16 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">Email Verified!</h2>
                            <p className="text-slate-500">Your account has been successfully activated.</p>
                            <Link to="/login" className="w-full">
                                <Button className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                                    Proceed to Login
                                </Button>
                            </Link>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                                <XCircle className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">Verification Failed</h2>
                            <p className="text-slate-500">{message}</p>
                            <Link to="/login" className="w-full">
                                <Button variant="outline" className="w-full">
                                    Back to Login
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </Card>
        </div>
    );
};
