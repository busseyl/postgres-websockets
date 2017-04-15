module PostgRESTWS.Database
  ( notify
  , listen
  , unlisten
  , waitForNotifications
  ) where

import Protolude
import Hasql.Pool (Pool, UsageError, use)
import Hasql.Session (sql)
import Hasql.Connection (Connection, withLibPQConnection)
import qualified Database.PostgreSQL.LibPQ      as PQ
import Data.Either.Combinators

import PostgRESTWS.Types

notify :: Pool -> ByteString -> ByteString -> IO (Either Error ())
notify pool channel mesg =
   mapError <$> use pool (sql ("NOTIFY " <> channel <> ", '" <> mesg <> "'"))
   where
     mapError :: Either UsageError () -> Either Error ()
     mapError = mapLeft (NotifyError . show)

listen :: Connection -> ByteString -> IO ()
listen con channel =
  void $ withLibPQConnection con execListen
  where
    execListen pqCon = void $ PQ.exec pqCon $ "LISTEN " <> channel

unlisten :: Connection -> ByteString -> IO ()
unlisten con channel =
  void $ withLibPQConnection con execListen
  where
    execListen pqCon = void $ PQ.exec pqCon $ "UNLISTEN " <> channel


waitForNotifications :: (ByteString -> ByteString -> IO()) -> Connection -> IO ()
waitForNotifications sendNotification con =
  withLibPQConnection con $ void . forkIO . forever . pqFetch
  where
    pqFetch pqCon = do
      mNotification <- PQ.notifies pqCon
      case mNotification of
        Nothing -> do
          mfd <- PQ.socket pqCon
          case mfd of
            Nothing  -> panic "Error checking for PostgreSQL notifications"
            Just fd -> do
              void $ threadWaitRead fd
              void $ PQ.consumeInput pqCon
        Just notification ->
           sendNotification (PQ.notifyRelname notification) (PQ.notifyExtra notification)
